import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  UploadCloud,
  Layers,
  Database,
  Users,
  ShieldCheck,
  X,
  LogOut,
} from 'lucide-react';

const MAIN_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
  { id: 'leads', label: 'Upload Files', icon: UploadCloud },
  { id: 'sessions', label: 'Sessions', icon: Layers, adminOnly: true },
  { id: 'dnc', label: 'DNC Upload', icon: Database, adminOnly: true },
];

const ADMIN_NAV = [{ id: 'users', label: 'Users', icon: Users }];

function NavItem({ item, active, onSelect }) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onSelect(item.id)}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-surface-raised text-white'
          : 'text-zinc-400 hover:bg-surface-raised/60 hover:text-zinc-100'
      }`}
    >
      {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-400" />}
      <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

export function Sidebar({ activeTab, setActiveTab, isOpen, onClose }) {
  const { user, logout, isAdmin } = useAuth();

  const primaryNav = MAIN_NAV.filter((n) => !n.adminOnly || isAdmin);
  const initials = (user?.name || user?.email || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleSelect = (id) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

  return (
    <>
      {isOpen && (
        <div onClick={onClose} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden" aria-hidden="true" />
      )}

      <aside
        className={`fixed bottom-0 left-0 top-0 z-40 flex w-64 flex-col border-r border-surface-border bg-surface-page transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex h-16 items-center justify-between border-b border-surface-border px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black shadow-md shadow-white/10">
              <ShieldCheck className="h-5 w-5" strokeWidth={2.4} />
            </div>
            <div className="leading-tight">
              <span className="block text-[15px] font-bold tracking-tight text-white">BLA Checker</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-500">DNC Compliance</span>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon md:hidden" aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
          <div>
            <p className="eyebrow mb-2 px-3">Menu</p>
            <div className="space-y-1">
              {primaryNav.map((item) => (
                <NavItem key={item.id} item={item} active={activeTab === item.id} onSelect={handleSelect} />
              ))}
            </div>
          </div>

          {isAdmin && (
            <div>
              <p className="eyebrow mb-2 px-3">Administration</p>
              <div className="space-y-1">
                {ADMIN_NAV.map((item) => (
                  <NavItem key={item.id} item={item} active={activeTab === item.id} onSelect={handleSelect} />
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* User */}
        <div className="border-t border-surface-border p-3">
          <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-surface-card p-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 font-semibold text-xs text-white ring-1 ring-white/10">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-100">{user?.name || user?.email}</p>
              <p className="truncate text-[11px] capitalize text-zinc-500">{user?.role || 'user'}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              className="shrink-0 rounded-lg p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
