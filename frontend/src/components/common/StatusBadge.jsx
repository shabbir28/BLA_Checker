import React from 'react';

export function StatusBadge({ status, label, size = 'sm' }) {
  const normStatus = String(status || '').toUpperCase();

  const configs = {
    CLEAN: {
      bg: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60',
      dot: 'bg-emerald-400',
      text: label || 'Clean',
    },
    LOCAL_DNC: {
      bg: 'bg-amber-950/40 text-amber-300 border-amber-800/60',
      dot: 'bg-amber-400',
      text: label || 'DNC (Existing)',
    },
    BLA_DNC: {
      bg: 'bg-red-950/40 text-red-300 border-red-800/60',
      dot: 'bg-red-400',
      text: label || 'DNC (BLA)',
    },
    INVALID: {
      bg: 'bg-zinc-900 text-zinc-400 border-zinc-800',
      dot: 'bg-zinc-500',
      text: label || 'Invalid',
    },
    DUPLICATE: {
      bg: 'bg-zinc-900 text-zinc-400 border-zinc-800',
      dot: 'bg-zinc-500',
      text: label || 'Duplicate',
    },
    PROCESSING: {
      bg: 'bg-blue-950/40 text-blue-300 border-blue-800/60 animate-pulse',
      dot: 'bg-blue-400',
      text: label || 'Checking...',
    },
    QUEUED: {
      bg: 'bg-zinc-900 text-zinc-300 border-zinc-800',
      dot: 'bg-zinc-400',
      text: label || 'Queued',
    },
    COMPLETED: {
      bg: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60',
      dot: 'bg-emerald-400',
      text: label || 'Done',
    },
    FAILED: {
      bg: 'bg-red-950/40 text-red-300 border-red-800/60',
      dot: 'bg-red-400',
      text: label || 'Failed',
    },
    ACTIVE: {
      bg: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60',
      dot: 'bg-emerald-400',
      text: label || 'Active',
    },
    SUSPENDED: {
      bg: 'bg-red-950/40 text-red-300 border-red-800/60',
      dot: 'bg-red-400',
      text: label || 'Suspended',
    },
    ADMIN: {
      bg: 'bg-zinc-900 text-white border-zinc-700',
      dot: 'bg-white',
      text: label || 'Admin',
    },
    USER: {
      bg: 'bg-zinc-900 text-zinc-300 border-zinc-800',
      dot: 'bg-zinc-400',
      text: label || 'User',
    },
  };

  const config = configs[normStatus] || {
    bg: 'bg-zinc-900 text-zinc-300 border-zinc-800',
    dot: 'bg-zinc-400',
    text: label || normStatus,
  };

  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.bg} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.text}
    </span>
  );
}

export default StatusBadge;
