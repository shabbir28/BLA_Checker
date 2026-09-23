import React from 'react';

export function MetricCard({ title, value, subtext, icon: Icon, color = 'brand', badge, trend }) {
  const colorStyles = {
    brand: 'from-brand-500/20 to-indigo-500/5 text-brand-400 border-brand-500/20',
    emerald: 'from-emerald-500/20 to-teal-500/5 text-emerald-400 border-emerald-500/20',
    cyan: 'from-cyan-500/20 to-blue-500/5 text-cyan-400 border-cyan-500/20',
    amber: 'from-amber-500/20 to-orange-500/5 text-amber-400 border-amber-500/20',
    rose: 'from-rose-500/20 to-pink-500/5 text-rose-400 border-rose-500/20',
    purple: 'from-purple-500/20 to-indigo-500/5 text-purple-400 border-purple-500/20',
  };

  const style = colorStyles[color] || colorStyles.brand;

  return (
    <div className="relative overflow-hidden rounded-2xl glass-panel p-5 border transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-black/40">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${style} rounded-bl-full opacity-40 blur-xl pointer-events-none`} />

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 ${style.split(' ')[2]}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-bold tracking-tight text-white font-mono">
          {value}
        </span>
        {badge && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">
            {badge}
          </span>
        )}
      </div>

      {subtext && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          {trend && (
            <span className={`font-medium ${trend > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
              {trend > 0 ? `+${trend}` : trend}
            </span>
          )}
          <span>{subtext}</span>
        </div>
      )}
    </div>
  );
}

export default MetricCard;
