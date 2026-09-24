const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const fullFormatter = new Intl.NumberFormat('en-US');

export function formatNumber(value) {
  const n = Number(value) || 0;
  return fullFormatter.format(n);
}

/** 1234 -> "1.2K", 5643353 -> "5.6M". Falls back to full digits under 10,000 for readability. */
export function formatCompact(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) < 10000) return fullFormatter.format(n);
  return compactFormatter.format(n);
}

export function formatPercent(value, digits = 1) {
  const n = Number(value) || 0;
  return `${n.toFixed(digits)}%`;
}

export function formatCurrency(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: n < 100 ? 2 : 0,
  }).format(n);
}

export function formatDateShort(isoDay) {
  if (!isoDay) return '';
  const d = new Date(`${isoDay}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDay;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function safeRate(part, whole) {
  const p = Number(part) || 0;
  const w = Number(whole) || 0;
  return w > 0 ? (p / w) * 100 : 0;
}
