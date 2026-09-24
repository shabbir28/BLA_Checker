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
function csvCell(value) {
  if (value === null || value === undefined) return '';
  return `"${String(value).replace(/"/g, '""')}"`;
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
