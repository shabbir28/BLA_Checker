import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  UploadCloud,
  Layers,
  Database,
  Users,
  ShieldCheck,
  ChevronRight,
  X,
  PiggyBank,
} from 'lucide-react';

export function Sidebar({ activeTab, setActiveTab, isOpen, onClose }) {
  const { isAdmin } = useAuth();

  const primaryNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'Upload File', icon: UploadCloud },
    { id: 'sessions', label: 'Sessions', icon: Layers },
    { id: 'dnc', label: 'DNC Upload', icon: Database },
  ];

  const adminNav = [
    { id: 'users', label: 'Users', icon: Users },
  ];

  const handleSelect = (id) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 border-r border-zinc-800 bg-black flex flex-col transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block">
                BLA <span className="text-zinc-400">CHECKER</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">DNC Compliance</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 rounded-lg md:hidden hover:text-white hover:bg-zinc-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3 py-6 space-y-6 overflow-y-auto">
          {/* Main Section */}
          <div>
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-2 font-mono">
              Main Menu
            </span>
            <div className="space-y-1">
              {primaryNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs md:text-sm font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-zinc-900 text-white border border-zinc-700 font-semibold'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-950'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Admin Section */}
          {isAdmin && (
            <div>
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-2 font-mono">
                Admin Menu
              </span>
              <div className="space-y-1">
                {adminNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs md:text-sm font-medium transition cursor-pointer ${
                        isActive
                          ? 'bg-zinc-900 text-white border border-zinc-700 font-semibold'
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-950'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Callout: Automatic Savings */}
        <div className="p-4 m-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
          <div className="flex items-center gap-2 mb-1.5 text-emerald-400 text-xs font-semibold">
            <PiggyBank className="w-4 h-4" />
            <span>Automatic Cost Savings</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Numbers already in your DNC database are filtered out for free before calling the BLA API.
          </p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
