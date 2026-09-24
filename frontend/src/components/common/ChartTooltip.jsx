import React from 'react';
import { formatNumber } from '../../utils/format';

/**
 * Dark-themed tooltip for Recharts. Pass `labelFormatter` to reformat the x-axis label
 * and `valueFormatter` to control how each series value is printed.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter = formatNumber,
  hideZero = false,
}) {
  if (!active || !payload || payload.length === 0) return null;

  const rows = hideZero ? payload.filter((p) => Number(p.value) !== 0) : payload;
  if (rows.length === 0) return null;

  return (
    <div className="min-w-[160px] rounded-xl border border-surface-border-strong bg-[#0c0c0e]/95 px-3.5 py-3 shadow-2xl backdrop-blur">
      {label !== undefined && label !== null && (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <ul className="space-y-1.5">
        {rows.map((p) => (
          <li key={p.dataKey || p.name} className="flex items-center justify-between gap-6 text-xs">
            <span className="flex items-center gap-2 text-zinc-300">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: p.color || p.payload?.color || p.fill || '#a1a1aa' }}
              />
              {p.name}
            </span>
            <span className="font-mono font-semibold text-white">{valueFormatter(p.value, p)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ChartTooltip;
