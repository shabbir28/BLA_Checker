import React from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({
  title = 'No records found',
  description = 'There are no items to display.',
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  compact = false,
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'p-8' : 'p-14'}`}>
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-surface-border bg-surface-raised text-zinc-500">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-zinc-500">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary btn-sm mt-4">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
