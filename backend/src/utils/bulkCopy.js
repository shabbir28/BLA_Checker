import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import pgCopyStreams from 'pg-copy-streams';

const copyFrom = pgCopyStreams.from;

/**
 * CSV-encode a single value for PostgreSQL `COPY ... WITH (FORMAT csv)`.
 * - null/undefined  -> empty unquoted field, which COPY reads as SQL NULL
 * - everything else -> quoted, with embedded quotes doubled
 * jsonb columns work because the quoted text is valid JSON once quotes are un-doubled.
 */
/** PostgreSQL JSON rejects null bytes and half of a surrogate pair. */
export function pgText(value) {
  if (value == null) return '';
  return String(value)
    .replace(/\u0000/g, '')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
}

function pgJsonValue(value) {
  if (value == null) return null;
  if (typeof value === 'string') return pgText(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(pgJsonValue);
  if (typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      if (child === undefined || typeof child === 'function') continue;
      out[pgText(key)] = pgJsonValue(child);
    }
    return out;
  }
  return pgText(value);
}

export function pgJson(value) {
  return JSON.stringify(pgJsonValue(value ?? null));
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  return `"${pgText(value).replace(/"/g, '""')}"`;
}

/**
 * Stream rows into a table using COPY, which is dramatically faster than many
 * INSERT/UNNEST round trips for large batches. Backpressure is handled by pipeline().
 *
 * @param {import('pg').PoolClient} client  a dedicated client (COPY needs its own session)
 * @param {string} copySql  e.g. `COPY t (a, b) FROM STDIN WITH (FORMAT csv)`
 * @param {Iterable} rows  any iterable (array, Map entries, generator)
 * @param {(row:any)=>Array} mapRow  maps a row to an ordered array of column values
 * @returns {Promise<number>} number of rows written
 */
export async function copyIntoTable(client, copySql, rows, mapRow) {
  let count = 0;
  const dest = client.query(copyFrom(copySql));

  const source = Readable.from(
    (function* generate() {
      for (const row of rows) {
        const cells = mapRow(row);
        count += 1;
        yield `${cells.map(csvCell).join(',')}\n`;
      }
    })(),
    { objectMode: false, encoding: 'utf8' }
  );

  await pipeline(source, dest);
  return count;
}

export default copyIntoTable;
