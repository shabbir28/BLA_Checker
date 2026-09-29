/**
 * Calendar-day timezone for dashboard analytics.
 * DNC / BLA reporting uses US Eastern, even when the server is UTC or the
 * operator's browser is in Pakistan.
 */
const FALLBACK = 'America/New_York';

function sanitizeTz(value) {
  if (!value || !/^[A-Za-z0-9_+\-/]+$/.test(value)) return FALLBACK;
  return value;
}

export const APP_TZ = sanitizeTz(process.env.APP_TIMEZONE || FALLBACK);

/** Validated SQL string literal, e.g. 'Asia/Karachi' */
export function tzSqlLiteral() {
  return `'${APP_TZ.replace(/'/g, "''")}'`;
}
