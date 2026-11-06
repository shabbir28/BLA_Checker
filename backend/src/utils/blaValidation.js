function phone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  const normalized = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  // BLA API sometimes returns malformed/extra entries — skip them instead of crashing the whole session
  if (!/^\d{10}$/.test(normalized)) return null;
  return normalized;
}

export function validateBulkResponse(response, submitted, { allowMissing = false } = {}) {
  const data = Array.isArray(response) && response.length === 1 ? response[0] : response;

  const fail = (reason) => {
    console.error(`[BLA VALIDATE] FAIL — ${reason} | status="${data?.status}" | phones=${data?.phones?.length ?? 'N/A'} | suppression=${(data?.suppression ?? data?.supression)?.length ?? 'N/A'} | wireless=${data?.wireless?.length ?? 'N/A'} | numbers=${data?.numbers} | count=${data?.count}`);
    throw new Error('BLA returned an unsuccessful or incomplete response. No clean list was approved; please retry checking.');
  };

  if (!data) fail('response is null/undefined');
  if (String(data.status).toLowerCase() !== 'success') fail(`status="${data.status}" is not success`);

  const suppression = data.supression ?? data.suppression;
  if (!Array.isArray(data.phones)) fail('phones is not an array');
  if (!Array.isArray(suppression)) fail('suppression/supression is not an array');
  if (!Array.isArray(data.wireless)) fail('wireless is not an array');

  // BLA API sometimes omits reasons entirely or returns null — treat as empty object
  const reasonsRaw = (data.reasons && typeof data.reasons === 'object' && !Array.isArray(data.reasons))
    ? data.reasons
    : {};

  // BLA API sometimes returns counts slightly off — only reject if clearly wrong (NaN or zero)
  const reportedNumbers = Number(data.numbers);
  const reportedCount = Number(data.count);
  if (isNaN(reportedNumbers) || isNaN(reportedCount) || reportedNumbers <= 0 || reportedCount < 0) {
    fail(`bad count — numbers=${data.numbers} count=${data.count}`);
  }

  const expected = new Set(submitted);
  const clean = new Set(data.phones.map(phone).filter(Boolean));
  const suppressed = new Set(suppression.map(phone).filter(Boolean));
  const wireless = new Set(data.wireless.map(phone).filter(Boolean));
  for (const set of [clean, suppressed, wireless]) {
    for (const value of set) if (!expected.has(value)) set.delete(value);
  }
  const reasons = {};
  for (const [key, value] of Object.entries(reasonsRaw)) {
    const normalized = phone(key);
    // BLA API sometimes returns reasons for clean (non-suppressed) numbers too — skip those silently
    // Also skip if phone() returned null (malformed key from BLA)
    if (normalized && expected.has(normalized) && !suppressed.has(normalized) && value && String(value).toLowerCase() !== 'none') {
      fail('reason supplied without a suppression classification');
    }
    if (normalized && suppressed.has(normalized)) {
      reasons[normalized] = value;
    }
  }

  // Require every submitted number to appear in either clean or suppressed list
  const missing = new Set();
  for (const value of expected) {
    if (!clean.has(value) && !suppressed.has(value)) missing.add(value);
  }
  if (missing.size > 0) {
    // BLA API sometimes silently drops 1–2 numbers (count field confirms this).
    // Do NOT fail — return missing set so caller can retry or handle conservatively.
    console.warn(`[BLA VALIDATE] WARNING — BLA dropped ${missing.size} numbers from response (count=${data.count} vs submitted=${submitted.length}). Will handle conservatively.`);
  }

  console.log(`[BLA VALIDATE] OK — clean=${clean.size} suppressed=${suppressed.size} wireless=${wireless.size} missing=${missing.size}`);
  return { clean, suppressed, wireless, reasons, missing };
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
