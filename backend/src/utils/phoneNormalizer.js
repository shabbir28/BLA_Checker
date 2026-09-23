/**
 * Phone Number Normalizer & Validator for BLA Checker
 */

export function normalizePhone(rawPhone) {
  if (rawPhone === null || rawPhone === undefined) {
    return {
      isValid: false,
      raw: '',
      normalized: '',
      formatted: '',
      reason: 'Missing phone number',
    };
  }

  const rawStr = String(rawPhone).trim();
  if (!rawStr) {
    return {
      isValid: false,
      raw: '',
      normalized: '',
      formatted: '',
      reason: 'Empty phone number',
    };
  }

  // Remove any extension text (e.g., ext, x, ext.)
  const basePhone = rawStr.split(/(?:ext|x|extension)\.?\s*\d+/i)[0];

  // Strip all non-digit characters
  let digits = basePhone.replace(/\D/g, '');

  // Handle US/North American Country Code (+1 or 1)
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.substring(1);
  }

  // Standard US 10-digit validation:
  // First digit (NPA) cannot be 0 or 1
  // Fourth digit (NXX) cannot be 0 or 1
  if (digits.length === 10) {
    const areaCodeFirstDigit = digits[0];
    const exchangeFirstDigit = digits[3];

    if (areaCodeFirstDigit === '0' || areaCodeFirstDigit === '1') {
      return {
        isValid: false,
        raw: rawStr,
        normalized: digits,
        formatted: digits,
        reason: 'Invalid Area Code (cannot start with 0 or 1)',
      };
    }

    if (exchangeFirstDigit === '0' || exchangeFirstDigit === '1') {
      return {
        isValid: false,
        raw: rawStr,
        normalized: digits,
        formatted: digits,
        reason: 'Invalid Exchange Code (cannot start with 0 or 1)',
      };
    }

    const formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    return {
      isValid: true,
      raw: rawStr,
      normalized: digits,
      formatted,
      reason: null,
    };
  }

  // International or non-standard 11-15 digits
  if (digits.length >= 7 && digits.length <= 15) {
    return {
      isValid: true,
      raw: rawStr,
      normalized: digits,
      formatted: `+${digits}`,
      reason: null,
    };
  }

  return {
    isValid: false,
    raw: rawStr,
    normalized: digits,
    formatted: digits,
    reason: `Invalid digit length (${digits.length} digits; expected 10)`,
  };
}

export function detectPhoneColumn(sampleRow) {
  if (!sampleRow || typeof sampleRow !== 'object') return null;

  const phoneKeywords = ['phone', 'telephone', 'tel', 'mobile', 'cell', 'contact', 'number', 'lead_phone'];

  // Check column names for strong keyword match
  for (const key of Object.keys(sampleRow)) {
    const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (phoneKeywords.some((kw) => lowerKey.includes(kw))) {
      return key;
    }
  }

  // If column name doesn't match, check the actual values for phone patterns
  for (const [key, val] of Object.entries(sampleRow)) {
    if (typeof val === 'string' || typeof val === 'number') {
      const normalized = normalizePhone(val);
      if (normalized.isValid) {
        return key;
      }
    }
  }

  return Object.keys(sampleRow)[0] || null;
}
