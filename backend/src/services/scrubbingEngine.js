import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import csvParser from 'csv-parser';
import { query, pool } from '../config/db.js';
import { normalizePhone, detectPhoneColumn } from '../utils/phoneNormalizer.js';
import blaService from './blaService.js';

class ScrubbingEngine {
  /**
   * Preview rows and detect phone column
   */
  async previewFile(filePath, originalFilename) {
    const ext = path.extname(originalFilename).toLowerCase();
    const rows = [];

    if (ext === '.xlsx' || ext === '.xls') {
      const workbook = xlsx.readFile(filePath, { sheetRows: 6 });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });
      rows.push(...data.slice(0, 5));
    } else if (ext === '.txt') {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 5);
      lines.forEach((line, index) => {
        rows.push({ line_number: index + 1, phone: line.trim() });
      });
    } else {
      // Default CSV
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on('data', (data) => {
            if (rows.length < 5) rows.push(data);
          })
          .on('end', resolve)
          .on('error', reject);
      });
    }

    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const detectedColumn = rows.length > 0 ? detectPhoneColumn(rows[0]) : null;

    return {
      previewRows: rows,
      columns,
      detectedPhoneColumn: detectedColumn,
    };
  }

  /**
   * Execute full multi-phase scrubbing pipeline
   */
  async processSession(sessionId, filePath, phoneColumn, user) {
    const startTime = Date.now();
    console.log(`[ENGINE] Starting scrub session ${sessionId}`);

    try {
      // 1. Initial State
      await query(
        `UPDATE checking_sessions
         SET status = 'PROCESSING', stage = 'PARSING', progress_percent = 5, started_at = NOW()
         WHERE id = $1`,
        [sessionId]
      );

      // Fetch Session info
      const sessionRes = await query('SELECT * FROM checking_sessions WHERE id = $1', [sessionId]);
      if (sessionRes.rows.length === 0) throw new Error('Session not found');
      const session = sessionRes.rows[0];

      // 2. Parse File - multer preserved the real extension on disk, so trust that over the
      // client-supplied display name.
      const ext = (path.extname(filePath) || path.extname(session.original_filename)).toLowerCase();
      let rawRows = [];

      if (ext === '.xlsx' || ext === '.xls') {
        const workbook = xlsx.readFile(filePath);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        rawRows = xlsx.utils.sheet_to_json(firstSheet, { defval: '' });
      } else if (ext === '.txt') {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
        rawRows = lines.map((l) => ({ phone: l.trim() }));
      } else {
        // CSV Parsing
        rawRows = await new Promise((resolve, reject) => {
          const items = [];
          fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (data) => items.push(data))
            .on('end', () => resolve(items))
            .on('error', reject);
        });
      }

      const totalRows = rawRows.length;
      if (totalRows === 0) {
        throw new Error('Uploaded file contains no data rows.');
      }

      // Auto-detect phone column if not specified
      const selectedColumn = phoneColumn || (rawRows[0] ? detectPhoneColumn(rawRows[0]) : 'phone');

      await query(
        `UPDATE checking_sessions
         SET total_rows = $1, stage = 'DEDUPLICATING', progress_percent = 15
         WHERE id = $2`,
        [totalRows, sessionId]
      );

      // 3. Normalization & Deduplication
      const allRecords = [];
      const seenPhones = new Set();
      const validPhoneMap = new Map(); // normalized -> array of indices in allRecords

      let validCount = 0;
      let invalidCount = 0;
      let duplicateCount = 0;

      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        const rawPhone = row[selectedColumn] ?? Object.values(row)[0] ?? '';
        const normResult = normalizePhone(rawPhone);

        if (!normResult.isValid) {
          invalidCount++;
          allRecords.push({
            session_id: sessionId,
            raw_phone: String(rawPhone),
            normalized_phone: normResult.normalized || null,
            original_row_data: row,
            status: 'INVALID',
            reason: normResult.reason,
            bla_response_raw: null,
          });
        } else {
          validCount++;
          if (seenPhones.has(normResult.normalized)) {
            duplicateCount++;
            allRecords.push({
              session_id: sessionId,
              raw_phone: String(rawPhone),
              normalized_phone: normResult.normalized,
              original_row_data: row,
              status: 'DUPLICATE',
              reason: 'Duplicate phone number in lead file',
              bla_response_raw: null,
            });
          } else {
            seenPhones.add(normResult.normalized);
            const recordIndex = allRecords.length;
            allRecords.push({
              session_id: sessionId,
              raw_phone: String(rawPhone),
              normalized_phone: normResult.normalized,
              original_row_data: row,
              status: 'PENDING',
              reason: null,
              bla_response_raw: null,
            });

            if (!validPhoneMap.has(normResult.normalized)) {
              validPhoneMap.set(normResult.normalized, []);
            }
            validPhoneMap.get(normResult.normalized).push(recordIndex);
          }
        }
      }

      await query(
        `UPDATE checking_sessions
         SET stage = 'LOCAL_SCRUB', progress_percent = 30,
             valid_numbers = $1, invalid_numbers = $2, duplicate_numbers = $3
         WHERE id = $4`,
        [validCount, invalidCount, duplicateCount, sessionId]
      );

      // 4. Phase 1: Local Internal Master DNC Scrub
      const uniqueNormalizedList = Array.from(validPhoneMap.keys());
      const localDncMatched = new Set();
      const localChunkSize = 2500;

      for (let i = 0; i < uniqueNormalizedList.length; i += localChunkSize) {
        const chunk = uniqueNormalizedList.slice(i, i + localChunkSize);
        const matchRes = await query(
          `SELECT normalized_phone FROM master_dnc WHERE normalized_phone = ANY($1::varchar[])`,
          [chunk]
        );
        for (const row of matchRes.rows) {
          localDncMatched.add(row.normalized_phone);
        }
      }

      let localDncCount = 0;
      const freshNumbers = [];

      for (const phone of uniqueNormalizedList) {
        const indices = validPhoneMap.get(phone);
        if (localDncMatched.has(phone)) {
          localDncCount += indices.length;
          for (const idx of indices) {
            allRecords[idx].status = 'LOCAL_DNC';
            allRecords[idx].reason = 'Matched Internal Master DNC Database (Skipped BLA API)';
            allRecords[idx].bla_response_raw = { source: 'LOCAL_MASTER_DNC_MATCH' };
          }
        } else {
          freshNumbers.push(phone);
        }
      }

      // The count of numbers spared from hitting the paid external API
      const apiCallsSaved = localDncCount;

      await query(
        `UPDATE checking_sessions
         SET stage = 'BLA_VERIFY', progress_percent = 50,
             local_dnc_count = $1, api_calls_saved = $2
         WHERE id = $3`,
        [localDncCount, apiCallsSaved, sessionId]
      );

      // 5. Phase 2: External BLA API Verification (FRESH NUMBERS ONLY)
      let blaDncCount = 0;
      let cleanCount = 0;
      const newDncToSync = [];
      const apiConfig = await blaService.getConfig();
      const blaBatchSize = Math.max(10, Math.min(apiConfig.batch_size || 100, 500));

      const totalFresh = freshNumbers.length;
      let processedFresh = 0;

      for (let i = 0; i < freshNumbers.length; i += blaBatchSize) {
        const batch = freshNumbers.slice(i, i + blaBatchSize);
        const batchResults = await blaService.verifyBatch(batch);

        for (const phone of batch) {
          const res = batchResults.get(phone) || {
            isDnc: false,
            status: 'CLEAN',
            reason: 'Clean - No DNC Record Found',
            raw: {},
          };

          const indices = validPhoneMap.get(phone);
          if (res.isDnc) {
            blaDncCount += indices.length;
            newDncToSync.push({
              phone,
              reason: res.reason,
            });
            for (const idx of indices) {
              allRecords[idx].status = 'BLA_DNC';
              allRecords[idx].reason = res.reason;
              allRecords[idx].bla_response_raw = res.raw;
            }
          } else {
            cleanCount += indices.length;
            for (const idx of indices) {
              allRecords[idx].status = 'CLEAN';
              allRecords[idx].reason = res.reason;
              allRecords[idx].bla_response_raw = res.raw;
            }
          }
        }

        processedFresh += batch.length;
        const freshPercent = totalFresh > 0 ? (processedFresh / totalFresh) * 35 : 35;
        const currentProgress = Math.min(85, Math.round(50 + freshPercent));

        await query(
          `UPDATE checking_sessions
           SET progress_percent = $1, bla_dnc_count = $2, clean_count = $3
           WHERE id = $4`,
          [currentProgress, blaDncCount, cleanCount, sessionId]
        );
      }

      // 6. Phase 3: Auto-Sync Newly Flagged BLA DNC Numbers to Master DNC
      await query(
        `UPDATE checking_sessions
         SET stage = 'SYNCING', progress_percent = 90
         WHERE id = $1`,
        [sessionId]
      );

      if (newDncToSync.length > 0) {
        console.log(`[ENGINE] Auto-syncing ${newDncToSync.length} newly discovered BLA DNC numbers into master_dnc...`);
        const syncChunkSize = 5000;
        for (let i = 0; i < newDncToSync.length; i += syncChunkSize) {
          const chunk = newDncToSync.slice(i, i + syncChunkSize);
          const chunkPhones = chunk.map((c) => c.phone);
          const chunkSource = new Array(chunk.length).fill('BLA_SYNC');
          const chunkFile = new Array(chunk.length).fill(session.session_name || 'BLA_SCRUB');
          const chunkNotes = chunk.map((c) => c.reason || 'Flagged by Blacklist Alliance');

          await query(
            `INSERT INTO master_dnc (phone_number, normalized_phone, source, campaign_or_file, notes, created_at)
             SELECT p, p, s, f, no, NOW()
             FROM UNNEST($1::varchar[], $2::varchar[], $3::varchar[], $4::text[]) AS t(p, s, f, no)
             ON CONFLICT (normalized_phone) DO NOTHING;`,
            [chunkPhones, chunkSource, chunkFile, chunkNotes]
          );
        }
      }

      // 7. Store Session Records in Database
      await query(
        `UPDATE checking_sessions
         SET stage = 'FINALIZING', progress_percent = 95
         WHERE id = $1`,
        [sessionId]
      );

      console.log(`[ENGINE] Bulk inserting ${allRecords.length} session records via UNNEST...`);
      const recordChunkSize = 5000;
      for (let i = 0; i < allRecords.length; i += recordChunkSize) {
        const chunk = allRecords.slice(i, i + recordChunkSize);

        const sIds = new Array(chunk.length).fill(sessionId);
        const rawPhones = chunk.map((r) => r.raw_phone || '');
        const normPhones = chunk.map((r) => r.normalized_phone || null);
        const origData = chunk.map((r) => JSON.stringify(r.original_row_data || {}));
        const statuses = chunk.map((r) => r.status);
        const reasons = chunk.map((r) => r.reason || null);
        const blaRaws = chunk.map((r) => (r.bla_response_raw ? JSON.stringify(r.bla_response_raw) : null));

        await query(
          `INSERT INTO session_records
           (session_id, raw_phone, normalized_phone, original_row_data, status, reason, bla_response_raw, created_at)
           SELECT s_id, raw_p, norm_p, orig_d::jsonb, stat, reas, bla_r::jsonb, NOW()
           FROM UNNEST($1::uuid[], $2::varchar[], $3::varchar[], $4::text[], $5::varchar[], $6::text[], $7::text[])
             AS t(s_id, raw_p, norm_p, orig_d, stat, reas, bla_r);`,
          [sIds, rawPhones, normPhones, origData, statuses, reasons, blaRaws]
        );
      }

      // 8. Mark Session Completed
      await query(
        `UPDATE checking_sessions
         SET status = 'COMPLETED',
             stage = 'DONE',
             progress_percent = 100,
             total_rows = $1,
             valid_numbers = $2,
             invalid_numbers = $3,
             duplicate_numbers = $4,
             local_dnc_count = $5,
             bla_dnc_count = $6,
             clean_count = $7,
             api_calls_saved = $8,
             completed_at = NOW()
         WHERE id = $9`,
        [
          totalRows,
          validCount,
          invalidCount,
          duplicateCount,
          localDncCount,
          blaDncCount,
          cleanCount,
          apiCallsSaved,
          sessionId,
        ]
      );

      // Audit Log
      await query(
        `INSERT INTO audit_logs (user_id, user_email, action, resource_type, resource_id, details)
         VALUES ($1, $2, 'LEAD_SCRUB_COMPLETED', 'SESSION', $3, $4)`,
        [
          user ? user.id : null,
          user ? user.email : 'system',
          sessionId,
          JSON.stringify({
            totalRows,
            cleanCount,
            localDncCount,
            blaDncCount,
            invalidCount,
            apiCallsSaved,
            durationMs: Date.now() - startTime,
          }),
        ]
      );

      console.log(`[ENGINE] Session ${sessionId} completed successfully in ${Date.now() - startTime}ms!`);
    } catch (error) {
      console.error(`[ENGINE] Scrubbing failed for session ${sessionId}:`, error);
      try {
        await query(
          `UPDATE checking_sessions
           SET status = 'FAILED', stage = 'FAILED', error_message = $1, completed_at = NOW()
           WHERE id = $2`,
          [error.message || 'Scrubbing failed', sessionId]
        );
      } catch (dbErr) {
        console.error(`[ENGINE] Could not mark session ${sessionId} as FAILED:`, dbErr.message);
      }
    } finally {
      // All rows are persisted in session_records, so the temp upload is no longer needed.
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (cleanupErr) {
        console.warn('[ENGINE] Cleanup warning:', cleanupErr.message);
      }
    }
  }
}

export const scrubbingEngine = new ScrubbingEngine();
export default scrubbingEngine;
