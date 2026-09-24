import React from 'react';

const SIZES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-7 w-7 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

export function LoadingSpinner({ message = 'Loading…', size = 'md', inline = false }) {
  const spinner = (
    <div
      role="status"
      aria-label={message || 'Loading'}
      className={`${SIZES[size] || SIZES.md} rounded-full border-surface-border-strong border-t-white animate-spin`}
    />
  );

  if (inline) return spinner;

  return (
    <div className="flex flex-col items-center justify-center p-10 text-center">
      {spinner}
      {message && <p className="mt-3 text-xs font-medium text-zinc-500">{message}</p>}
    </div>
  );
}

export default LoadingSpinner;
