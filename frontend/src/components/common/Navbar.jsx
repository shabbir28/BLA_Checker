import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Menu, User as UserIcon } from 'lucide-react';

export function Navbar({ onToggleSidebar, activeTab }) {
  const { user, logout } = useAuth();

  const tabTitles = {
    dashboard: 'Dashboard',
    leads: 'Upload Files',
    sessions: 'Sessions',
    dnc: 'DNC Upload',
    users: 'Users',
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 border-b border-zinc-800 bg-black/90 backdrop-blur-md">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-zinc-400 rounded-lg md:hidden hover:text-white hover:bg-zinc-900"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-base md:text-lg font-bold text-white tracking-tight">
          {tabTitles[activeTab] || 'Dashboard'}
        </h1>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* User Profile */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white text-xs font-bold">
            {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>

          <div className="hidden sm:flex flex-col items-start leading-none">
            <span className="text-xs font-semibold text-zinc-200">{user?.name || user?.email}</span>
            <span className="text-[10px] text-zinc-500 capitalize mt-0.5">{user?.role}</span>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-lg transition ml-1 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
