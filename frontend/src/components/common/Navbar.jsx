import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Menu, LogOut } from 'lucide-react';

const PAGES = {
  dashboard: { title: 'Dashboard', subtitle: 'Analytics and recent activity' },
  leads: { title: 'Upload Files', subtitle: 'Upload a file and scrub it against DNC lists' },
  sessions: { title: 'Sessions', subtitle: 'Every uploaded file and its results' },
  dnc: { title: 'DNC Upload', subtitle: 'Your internal Do Not Call suppression list' },
  users: { title: 'Users', subtitle: 'Accounts and roles' },
};

export function Navbar({ onToggleSidebar, activeTab }) {
  const { user, logout } = useAuth();
  const page = PAGES[activeTab] || PAGES.dashboard;
  const initial = (user?.name || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-surface-border bg-surface-page/85 px-4 backdrop-blur-md md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onToggleSidebar} className="btn-icon md:hidden" aria-label="Open menu">
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0 leading-tight">
          <h1 className="truncate text-[15px] font-semibold text-white md:text-base">{page.title}</h1>
          <p className="hidden truncate text-xs text-zinc-500 sm:block">{page.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-card py-1 pl-1 pr-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 text-xs font-semibold text-white ring-1 ring-white/10">
            {initial}
          </div>
          <div className="hidden leading-none md:block">
            <p className="max-w-[140px] truncate text-xs font-medium text-zinc-100">{user?.name || user?.email}</p>
            <p className="mt-0.5 text-[10px] capitalize text-zinc-500">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
