import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Database,
  Zap,
  FileCheck2,
  Loader2,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Database,
    title: 'Local DNC pre-match',
    text: 'Every number is checked against your Master DNC first, so known numbers never hit the paid API.',
  },
  {
    icon: Zap,
    title: 'Blacklist Alliance verification',
    text: 'Fresh numbers are verified live in batches, with results synced back into your DNC list automatically.',
  },
  {
    icon: FileCheck2,
    title: 'Audit-ready exports',
    text: 'Download clean lists or the full per-number report as CSV or Excel, with a complete activity log.',
  },
];

export function AuthPage() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await login(email.trim(), password);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-page text-white grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      {/* ---------- Left: Branding panel ---------- */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-surface-border bg-black-dots">
        <div className="absolute inset-0 bg-glow pointer-events-none" />

        <div className="relative z-10 p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black shadow-lg shadow-white/10">
              <ShieldCheck className="h-5 w-5" strokeWidth={2.4} />
            </div>
            <div className="leading-tight">
              <span className="block text-base font-bold tracking-tight">BLA Checker</span>
              <span className="block text-[11px] font-medium text-zinc-500">DNC Compliance Platform</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-10 xl:px-14 pb-10 xl:pb-14 max-w-xl">
          <span className="eyebrow">Lead scrubbing, done right</span>
          <h1 className="mt-3 text-4xl xl:text-[2.75rem] font-bold leading-[1.1] tracking-tight">
            Verify every number
            <span className="block text-zinc-400">before you dial.</span>
          </h1>
          <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
            A three-phase pipeline that removes DNC numbers, cuts API spend, and keeps a complete audit trail for
            compliance.
          </p>

          <ul className="mt-9 space-y-5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.title} className="flex items-start gap-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-emerald-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{f.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-500 leading-relaxed">{f.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-surface-border px-10 xl:px-14 py-5 text-[11px] text-zinc-600">
          <span>© {new Date().getFullYear()} BLA Checker</span>
          <span className="font-mono">v1.0.0</span>
        </div>
      </aside>

      {/* ---------- Right: Form ---------- */}
      <main className="flex flex-col justify-center px-5 py-10 sm:px-10">
        {/* Mobile brand header */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black">
            <ShieldCheck className="h-5 w-5" strokeWidth={2.4} />
          </div>
          <div className="leading-tight">
            <span className="block text-sm font-bold">BLA Checker</span>
            <span className="block text-[11px] text-zinc-500">DNC Compliance Platform</span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[400px] animate-fade-in-up">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="mt-1.5 text-sm text-zinc-400">Sign in to check and scrub phone numbers.</p>
          </div>

          {error && (
            <div className="alert-error mb-5" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-px" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="label">Email address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="input input-with-icon"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input input-with-icon pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-500 transition hover:bg-surface-hover hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[11px] text-zinc-600">
            Accounts are created by your administrator. Activity is logged for compliance.
          </p>
        </div>
      </main>
    </div>
  );
}

export default AuthPage;
