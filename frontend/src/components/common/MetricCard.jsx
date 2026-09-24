import React from 'react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const TONES = {
  white: {
    icon: 'bg-zinc-800 text-white border-zinc-700',
    badge: 'bg-zinc-800 text-zinc-200 border-zinc-700',
    stroke: '#e4e4e7',
    fill: '#e4e4e7',
  },
  emerald: {
    icon: 'bg-emerald-950/70 text-emerald-400 border-emerald-900/60',
    badge: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
    stroke: '#10b981',
    fill: '#10b981',
  },
  red: {
    icon: 'bg-red-950/70 text-red-400 border-red-900/60',
    badge: 'bg-red-950/60 text-red-300 border-red-800/60',
    stroke: '#ef4444',
    fill: '#ef4444',
  },
  amber: {
    icon: 'bg-amber-950/70 text-amber-400 border-amber-900/60',
    badge: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
    stroke: '#f59e0b',
    fill: '#f59e0b',
  },
  cyan: {
    icon: 'bg-cyan-950/70 text-cyan-400 border-cyan-900/60',
    badge: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60',
    stroke: '#06b6d4',
    fill: '#06b6d4',
  },
  violet: {
    icon: 'bg-violet-950/70 text-violet-400 border-violet-900/60',
    badge: 'bg-violet-950/60 text-violet-300 border-violet-800/60',
    stroke: '#8b5cf6',
    fill: '#8b5cf6',
  },
};

/**
 * KPI card.
 * - `trend`: { value: number (percent, +/-), label?: string } renders an up/down chip.
 * - `sparkline`: number[] renders a mini area chart in the card footer.
 */
export function MetricCard({
  title,
  value,
  subtext,
  icon: Icon,
  color = 'white',
  badge,
  trend,
  sparkline,
  footer,
  loading = false,
}) {
  const tone = TONES[color] || TONES.white;
  const gradientId = `spark-${color}`;
  const sparkData = Array.isArray(sparkline) ? sparkline.map((v, i) => ({ i, v: Number(v) || 0 })) : null;
  const hasSpark = sparkData && sparkData.length > 1 && sparkData.some((d) => d.v !== 0);

  let TrendIcon = Minus;
  let trendClass = 'text-zinc-400 bg-surface-raised border-surface-border';
  if (trend && typeof trend.value === 'number') {
    if (trend.value > 0) {
      TrendIcon = TrendingUp;
      trendClass = 'text-emerald-300 bg-emerald-950/50 border-emerald-800/60';
    } else if (trend.value < 0) {
      TrendIcon = TrendingDown;
      trendClass = 'text-red-300 bg-red-950/50 border-red-800/60';
    }
  }

  return (
    <div className="card card-hover relative flex flex-col overflow-hidden p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          {Icon && (
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${tone.icon}`}>
              <Icon className="h-[17px] w-[17px]" />
            </div>
          )}
          <span className="min-h-[2.25rem] text-[12.5px] font-medium leading-snug text-zinc-400 line-clamp-2">
            {title}
          </span>
        </div>

        {badge && (
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.badge}`}>
            {badge}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {loading ? (
            <div className="skeleton h-8 w-28" />
          ) : (
            <span className="block truncate font-mono text-[28px] font-bold leading-none tracking-tight text-white">
              {value}
            </span>
          )}
          {subtext && <p className="mt-2 text-xs text-zinc-500">{subtext}</p>}
        </div>

        {trend && typeof trend.value === 'number' && (
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${trendClass}`}>
            <TrendIcon className="h-3 w-3" />
            {Math.abs(trend.value).toFixed(1)}%
            {trend.label && <span className="ml-0.5 font-normal text-zinc-500">{trend.label}</span>}
          </span>
        )}
      </div>

      {hasSpark ? (
        <div className="pointer-events-none mt-auto -mx-5 -mb-5 h-12 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tone.fill} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={tone.fill} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={tone.stroke}
                strokeWidth={1.75}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : footer ? (
        <div className="mt-auto -mx-5 -mb-5 flex h-12 items-center border-t border-surface-border px-5">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export default MetricCard;
