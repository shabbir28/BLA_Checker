import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileCheck2,
  Database,
  Users,
  Cpu,
  History,
  ShieldCheck,
  ChevronRight,
  TrendingDown,
  X,
} from 'lucide-react';

export function Sidebar({ activeTab, setActiveTab, isOpen, onClose }) {
  const { isAdmin } = useAuth();

  const primaryNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'Lead Scrubbing', icon: FileCheck2 },
    { id: 'dnc', label: 'Master DNC', icon: Database },
  ];

  const adminNav = [
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'api', label: 'API & Engine', icon: Cpu },
    { id: 'audit', label: 'Audit Trail', icon: History },
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
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 border-r border-slate-800 bg-slate-950 flex flex-col transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/25">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white block">
                BLA <span className="text-brand-400">CHECKER</span>
              </span>
              <span className="text-[10px] text-slate-400 tracking-widest uppercase font-mono font-semibold">
                DNC Compliance OS
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 rounded-lg md:hidden hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
          {/* Main Workspace */}
          <div>
            <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Workspace
            </span>
            <div className="space-y-1">
              {primaryNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-600/15 text-brand-300 border border-brand-500/30 shadow-sm shadow-brand-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-brand-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Admin Management Section */}
          {isAdmin && (
            <div>
              <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Administration
              </span>
              <div className="space-y-1">
                {adminNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-brand-600/15 text-brand-300 border border-brand-500/30 shadow-sm shadow-brand-500/10'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-brand-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Feature Card: Cost Optimization Callout */}
        <div className="p-4 m-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80">
          <div className="flex items-center gap-2 mb-2 text-emerald-400 text-xs font-semibold">
            <TrendingDown className="w-4 h-4" />
            <span>Smart Scrubbing</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Internal Master DNC pre-matching filters out known records locally, eliminating redundant paid BLA API calls.
          </p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
