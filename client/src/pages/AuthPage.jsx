import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  Database,
  Coins,
  Cpu,
  Sparkles,
} from 'lucide-react';

export function AuthPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setIsRegister(false);
    setError(null);
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 bg-grid-pattern">
      {/* Left Column: Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/25">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white block">
                BLA <span className="text-brand-400">CHECKER</span>
              </span>
              <span className="text-[10px] text-slate-400 tracking-widest uppercase font-mono font-semibold">
                DNC Compliance Engine
              </span>
            </div>
          </div>

          {/* Form Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {isRegister ? 'Create an Account' : 'Welcome back'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {isRegister
                ? 'Join BLA Checker to scrub leads and manage DNC compliance'
                : 'Sign in to access your scrubbing sessions and master DNC database'}
            </p>
          </div>

          {/* 1-Click Quick Demo Login Pill Selector */}
          {!isRegister && (
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Instant Demo Access (Pre-Configured)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@blachecker.com', 'Admin123!')}
                  className="px-3 py-2 rounded-xl bg-brand-600/15 hover:bg-brand-600/25 text-brand-300 border border-brand-500/30 text-xs font-medium text-left transition cursor-pointer"
                >
                  <span className="font-bold block">Administrator</span>
                  <span className="text-[10px] text-slate-400 font-mono">admin@blachecker.com</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('user@blachecker.com', 'User123!')}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium text-left transition cursor-pointer"
                >
                  <span className="font-bold block">Lead Specialist</span>
                  <span className="text-[10px] text-slate-400 font-mono">user@blachecker.com</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Actual Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-brand-500 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-brand-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-brand-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-brand-500/25 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{isRegister ? 'Create Account' : 'Sign In to Workspace'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle between Login and Register */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              {isRegister ? (
                <span>
                  Already have an account? <span className="text-brand-400 font-semibold underline">Sign In</span>
                </span>
              ) : (
                <span>
                  Don't have an account? <span className="text-brand-400 font-semibold underline">Register</span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Hero Visuals */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-900 items-center justify-center p-12 overflow-hidden border-l border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/30 via-slate-950 to-slate-900" />
        <div className="absolute top-1/4 -right-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Compliance Platform</span>
          </div>

          <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
            Stop Paying for Repeat Checks on Known DNC Numbers.
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            BLA Checker combines an ultra-fast internal Master DNC repository with live BLA verification and automated continuous synchronization.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-1">
              <Database className="w-5 h-5 text-brand-400" />
              <span className="font-semibold text-white text-xs block">Local Master DNC</span>
              <span className="text-[11px] text-slate-400 block">Sub-millisecond indexed pre-checks</span>
            </div>

            <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-1">
              <Coins className="w-5 h-5 text-amber-400" />
              <span className="font-semibold text-white text-xs block">API Cost Protection</span>
              <span className="text-[11px] text-slate-400 block">Zero fee on known DNC matches</span>
            </div>

            <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-1">
              <Cpu className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-white text-xs block">Auto-Sync Engine</span>
              <span className="text-[11px] text-slate-400 block">Ingests BLA flags automatically</span>
            </div>

            <div className="p-4 rounded-2xl glass-panel border border-slate-800 space-y-1">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <span className="font-semibold text-white text-xs block">TCPA Safe Exports</span>
              <span className="text-[11px] text-slate-400 block">Instant CSV/XLSX downloads</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
