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

  // Partial responses may report fewer processed numbers than submitted.
  // BLA API sometimes returns counts slightly off — only reject if clearly wrong (NaN or zero)
  const reportedNumbers = Number(data.numbers);
  const reportedCount = Number(data.count);
  if (isNaN(reportedNumbers) || isNaN(reportedCount) || reportedNumbers <= 0 || reportedCount < 0) {
    fail(`bad count — numbers=${data.numbers} count=${data.count}`);
  }

  const expected = new Set(submitted);
  // Build filtered sets directly — never mutate a Set while iterating it (undefined behavior).
  // Also filter out any BLA-returned phones that were not in our submitted batch.
  const clean      = new Set(data.phones.map(phone).filter(Boolean).filter((v) => expected.has(v)));
  const suppressed = new Set(suppression.map(phone).filter(Boolean).filter((v) => expected.has(v)));
  const wireless   = new Set(data.wireless.map(phone).filter(Boolean).filter((v) => expected.has(v)));
  // Note: strict reportedCount === clean+suppressed check removed — BLA sometimes drops
  // numbers silently (count=4999 for 5000 submitted), handled via the `missing` set below.
  const reasons = {};
  for (const [key, value] of Object.entries(reasonsRaw)) {
    const normalized = phone(key);
    // BLA API sometimes returns reason codes for clean (non-suppressed) numbers — skip silently.
    // Also skip malformed keys where phone() returned null.
    if (normalized && suppressed.has(normalized)) {
      reasons[normalized] = value;
    }
  }

  // Require every submitted number to appear in either clean or suppressed list
  const missing = new Set();
  for (const value of expected) {
    if (!clean.has(value) && !suppressed.has(value)) missing.add(value);
  }
  if (missing.size > 0 && !allowMissing) {
    throw new Error(`BLA returned an incomplete response: ${missing.size} numbers have no result. No clean list was approved.`);
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
