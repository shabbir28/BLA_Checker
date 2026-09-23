import React from 'react';

export function StatusBadge({ status, label, size = 'sm' }) {
  const normStatus = String(status || '').toUpperCase();

  const configs = {
    CLEAN: {
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-400',
      text: label || 'Clean / Safe',
    },
    LOCAL_DNC: {
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      dot: 'bg-amber-400',
      text: label || 'Master DNC Match',
    },
    BLA_DNC: {
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      dot: 'bg-rose-400',
      text: label || 'BLA DNC Match',
    },
    INVALID: {
      bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      dot: 'bg-slate-400',
      text: label || 'Invalid Number',
    },
    DUPLICATE: {
      bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      dot: 'bg-purple-400',
      text: label || 'Duplicate',
    },
    PROCESSING: {
      bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse',
      dot: 'bg-indigo-400',
      text: label || 'Processing',
    },
    QUEUED: {
      bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      dot: 'bg-blue-400',
      text: label || 'Queued',
    },
    COMPLETED: {
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-400',
      text: label || 'Completed',
    },
    FAILED: {
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      dot: 'bg-rose-400',
      text: label || 'Failed',
    },
    ACTIVE: {
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-400',
      text: label || 'Active',
    },
    SUSPENDED: {
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      dot: 'bg-rose-400',
      text: label || 'Suspended',
    },
    ADMIN: {
      bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      dot: 'bg-cyan-400',
      text: label || 'Admin',
    },
    USER: {
      bg: 'bg-brand-500/10 text-brand-300 border-brand-500/20',
      dot: 'bg-brand-400',
      text: label || 'User',
    },
  };

  const config = configs[normStatus] || {
    bg: 'bg-slate-700/30 text-slate-300 border-slate-700',
    dot: 'bg-slate-400',
    text: label || normStatus,
  };

  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${sizeClasses} transition-colors`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.text}
    </span>
  );
}

export default StatusBadge;
