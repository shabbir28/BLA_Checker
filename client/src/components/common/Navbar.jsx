import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, LogOut, User as UserIcon, PlusCircle, Server, Menu } from 'lucide-react';
import StatusBadge from './StatusBadge';

export function Navbar({ onOpenNewScrub, onToggleSidebar, activeTab }) {
  const { user, logout, isAdmin } = useAuth();

  const tabTitles = {
    dashboard: 'System Overview & Analytics',
    leads: 'Lead Compliance & Scrubbing Studio',
    dnc: 'Master DNC Repository',
    users: 'User & Access Management',
    api: 'BLA API & Engine Configuration',
    audit: 'System Audit Trail',
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-400 rounded-lg md:hidden hover:text-white hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-semibold text-white tracking-tight">
              {tabTitles[activeTab] || 'BLA Checker'}
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              TCPA Compliance & Autonomous DNC Verification
            </p>
          </div>
        </div>
      </div>

      {/* Right: Quick Scrub Button + System Status + User Badge + Logout */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Quick New Scrub Action */}
        <button
          onClick={onOpenNewScrub}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs md:text-sm font-medium shadow-md shadow-brand-500/20 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">New Lead Scrub</span>
        </button>

        {/* Live Engine Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Server className="w-3.5 h-3.5 text-slate-400" />
          <span>PostgreSQL & BLA Online</span>
        </div>

        {/* User Info & Role */}
        <div className="flex items-center gap-2.5 pl-2 md:pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs font-semibold">
            {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>

          <div className="hidden md:flex flex-col items-start leading-none">
            <span className="text-xs font-medium text-slate-200">{user?.name || user?.email}</span>
            <div className="mt-1">
              <StatusBadge status={user?.role} size="xs" />
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
