import React from 'react';

export function LoadingSpinner({ message = 'Loading...', size = 'md' }) {
  const sizeMap = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div
        className={`${sizeMap[size] || sizeMap.md} rounded-full border-slate-700 border-t-brand-500 animate-spin mb-3`}
      />
      {message && <p className="text-sm font-medium text-slate-400">{message}</p>}
    </div>
  );
}

export default LoadingSpinner;
