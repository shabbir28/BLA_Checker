import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Mail, Lock, User, ArrowRight, AlertCircle, Check } from 'lucide-react';

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
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
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
    <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-4 bg-black-dots selection:bg-white selection:text-black">
      <div className="w-full max-w-md">
        {/* App Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-white mb-4 shadow-xl shadow-black/80">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">BLA Checker</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {isRegister ? 'Create an account to start checking leads' : 'Sign in to check and scrub phone numbers'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/90">
          {/* Quick Demo Login Buttons */}
          {!isRegister && (
            <div className="mb-6 pb-6 border-b border-zinc-800/80">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block mb-2.5 text-center">
                One-Click Quick Login
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@blachecker.com', 'Admin123!')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    email === 'admin@blachecker.com'
                      ? 'bg-zinc-900 border-white text-white'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Admin Demo</span>
                    {email === 'admin@blachecker.com' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1 font-mono truncate">admin@blachecker.com</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('user@blachecker.com', 'User123!')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    email === 'user@blachecker.com'
                      ? 'bg-zinc-900 border-white text-white'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">User Demo</span>
                    {email === 'user@blachecker.com' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1 font-mono truncate">user@blachecker.com</span>
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-white text-sm focus:outline-none focus:border-white transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-white text-sm focus:outline-none focus:border-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-white text-sm focus:outline-none focus:border-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm transition disabled:opacity-50 cursor-pointer shadow-lg shadow-white/10"
            >
              {loading ? (
                <span>Please wait...</span>
              ) : (
                <>
                  <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Register/Sign In */}
          <div className="mt-6 text-center pt-4 border-t border-zinc-900">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-xs text-zinc-400 hover:text-white transition"
            >
              {isRegister ? (
                <span>
                  Already have an account? <span className="text-white font-medium underline">Sign In</span>
                </span>
              ) : (
                <span>
                  Don't have an account? <span className="text-white font-medium underline">Register</span>
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-zinc-600 mt-6 font-mono">
          BLA Checker · True Black DNC Verification
        </p>
      </div>
    </div>
  );
}

export default AuthPage;
