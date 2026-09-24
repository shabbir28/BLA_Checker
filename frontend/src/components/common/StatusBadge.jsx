import React from 'react';

const CONFIGS = {
  CLEAN: { cls: 'chip-emerald', dot: 'bg-emerald-400', text: 'Clean' },
  LOCAL_DNC: { cls: 'chip-amber', dot: 'bg-amber-400', text: 'Already in DNC' },
  BLA_DNC: { cls: 'chip-red', dot: 'bg-red-400', text: 'DNC from BLA' },
  INVALID: { cls: 'chip-zinc', dot: 'bg-zinc-500', text: 'Invalid' },
  DUPLICATE: { cls: 'chip-zinc', dot: 'bg-zinc-500', text: 'Duplicate' },
  PROCESSING: { cls: 'chip-blue', dot: 'bg-blue-400 animate-pulse', text: 'Processing' },
  QUEUED: { cls: 'chip-zinc', dot: 'bg-zinc-400', text: 'Queued' },
  COMPLETED: { cls: 'chip-emerald', dot: 'bg-emerald-400', text: 'Completed' },
  FAILED: { cls: 'chip-red', dot: 'bg-red-400', text: 'Failed' },
  ACTIVE: { cls: 'chip-emerald', dot: 'bg-emerald-400', text: 'Active' },
  SUSPENDED: { cls: 'chip-red', dot: 'bg-red-400', text: 'Suspended' },
  ADMIN: { cls: 'chip-zinc border-zinc-600 text-white', dot: 'bg-white', text: 'Admin' },
  USER: { cls: 'chip-zinc', dot: 'bg-zinc-400', text: 'User' },
};

export function StatusBadge({ status, label, size = 'sm' }) {
  const normStatus = String(status || '').toUpperCase();
  const config = CONFIGS[normStatus] || { cls: 'chip-zinc', dot: 'bg-zinc-400', text: normStatus || '—' };
  const sizeCls = size === 'xs' ? 'text-[10.5px] px-2 py-px' : '';

  return (
    <span className={`${config.cls} ${sizeCls} whitespace-nowrap font-medium`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {label || config.text}
    </span>
  );
}

export default StatusBadge;
