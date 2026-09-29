import React from 'react';

export function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-surface-page text-center text-zinc-400">
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-black-dots" />
      <div className="relative">
        <h1 className="text-6xl font-bold tracking-tight text-white">404</h1>
        <p className="mt-3 text-sm uppercase tracking-[0.2em] text-zinc-500">Not Found</p>
      </div>
    </div>
  );
}

export default NotFoundPage;
