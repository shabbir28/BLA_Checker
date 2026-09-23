import React from 'react';

export function MetricCard({ title, value, subtext, icon: Icon, color = 'white', badge }) {
  const colorMap = {
    white: 'text-white border-zinc-700 bg-zinc-900',
    emerald: 'text-emerald-400 border-emerald-900/60 bg-emerald-950/30',
    red: 'text-red-400 border-red-900/60 bg-red-950/30',
    amber: 'text-amber-400 border-amber-900/60 bg-amber-950/30',
    cyan: 'text-cyan-400 border-cyan-900/60 bg-cyan-950/30',
  };

  const badgeStyle = colorMap[color] || colorMap.white;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 p-5 hover:border-zinc-700 transition">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-zinc-400">
          {title}
        </span>
        {Icon && (
          <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-bold tracking-tight text-white font-mono">
          {value}
        </span>
        {badge && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeStyle}`}>
            {badge}
          </span>
        )}
      </div>

      {subtext && (
        <p className="text-xs text-zinc-500 mt-1">
          {subtext}
        </p>
      )}
    </div>
  );
}

export default MetricCard;
