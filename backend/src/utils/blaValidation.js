function phone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  // BLA API sometimes returns malformed/extra entries — skip them instead of crashing the whole session
  if (!/^\d{10}$/.test(normalized)) return null;
  return normalized;
}

export function validateBulkResponse(response, submitted) {
  const data = Array.isArray(response) && response.length === 1 ? response[0] : response;
  const fail = () => { throw new Error('BLA returned an unsuccessful or incomplete response. No clean list was approved; please retry checking.'); };
  if (!data || String(data.status).toLowerCase() !== 'success') fail();
  const suppression = data.supression ?? data.suppression;
  if (!Array.isArray(data.phones) || !Array.isArray(suppression) || !Array.isArray(data.wireless)) fail();
  // BLA API sometimes omits reasons entirely or returns null — treat as empty object
  const reasonsRaw = (data.reasons && typeof data.reasons === 'object' && !Array.isArray(data.reasons))
    ? data.reasons
    : {};
  // BLA API sometimes returns counts slightly off — only reject if clearly wrong (NaN or zero)
  const reportedNumbers = Number(data.numbers);
  const reportedCount = Number(data.count);
  if (isNaN(reportedNumbers) || isNaN(reportedCount) || reportedNumbers === 0 || reportedCount === 0) fail();
  const expected = new Set(submitted);
  const clean = new Set(data.phones.map(phone).filter(Boolean));
  const suppressed = new Set(suppression.map(phone).filter(Boolean));
  const wireless = new Set(data.wireless.map(phone).filter(Boolean));
  const reasons = {};
  for (const [key, value] of Object.entries(reasonsRaw)) {
    const normalized = phone(key);
    // BLA API sometimes returns reasons for clean (non-suppressed) numbers too — skip those silently
    // Also skip if phone() returned null (malformed key from BLA)
    if (normalized && suppressed.has(normalized)) {
      reasons[normalized] = value;
    }
  }
  // Warn but don't fail if BLA returns unexpected extras — just ignore them
  // Require every submitted number to appear in either clean or suppressed list
  for (const value of expected) if (!clean.has(value) && !suppressed.has(value)) fail();
  return { clean, suppressed, wireless, reasons };
}

export function requireVerifiedResult(result) {
  if (!result || typeof result.isDnc !== 'boolean' ||
      result.status !== (result.isDnc ? 'BLA_DNC' : 'CLEAN') ||
      result.raw?.suppressed !== result.isDnc ||
      result.raw?.verification !== 'bulk-double-check-v1') {
    throw new Error('Missing or unverified BLA result. No clean list was approved; please retry checking.');
  }
  return result;
}
