import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  Cpu,
  Key,
  Globe,
  Zap,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  Save,
  Radio,
  Clock,
  Eye,
  EyeOff,
} from 'lucide-react';

export function ApiConfigManager() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Connection Test State
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showKey, setShowKey] = useState(false);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getApiConfig();
      setConfig(res.data.config);
    } catch (err) {
      console.error('[CONFIG] Fetch error:', err);
      setError('Failed to fetch API configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      const res = await adminApi.updateApiConfig(config);
      setConfig(res.data.config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      const res = await adminApi.testConnection({ config });
      setTestResult(res.data);
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || err.message,
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading BLA Engine configuration..." size="lg" />;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border border-slate-800 bg-gradient-to-r from-slate-900/90 to-brand-950/20">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            BLA API & Engine Configuration
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Configure external BLA verification endpoints, manage credentials, and toggle between Live Production and High-Speed Simulation mode.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
          >
            <Radio className={`w-4 h-4 text-cyan-400 ${testing ? 'animate-ping' : ''}`} />
            <span>{testing ? 'Testing Latency...' : 'Test Connection'}</span>
          </button>
        </div>
      </div>

      {/* Diagnostics / Ping Result Feedback Banner */}
      {testResult && (
        <div
          className={`p-5 rounded-2xl border ${
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">
                  {testResult.success ? 'Endpoint Responded Successfully' : 'Endpoint Connection Failed'}
                </span>
                {testResult.latencyMs !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-black/30 border border-current">
                    Latency: {testResult.latencyMs}ms
                  </span>
                )}
                {testResult.isMock && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    High-Speed Simulator Active
                  </span>
                )}
              </div>
              <p className="text-xs opacity-90">{testResult.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Mode Selector Card */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Engine Operation Mode</h3>
              <p className="text-xs text-slate-400">Choose how fresh numbers are verified</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold font-mono border ${
                config.is_mock_mode
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {config.is_mock_mode ? 'SIMULATION MODE' : 'LIVE API MODE'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setConfig({ ...config, is_mock_mode: true })}
              className={`p-4 rounded-xl border cursor-pointer transition ${
                config.is_mock_mode
                  ? 'bg-brand-600/15 border-brand-500/50 shadow-md shadow-brand-500/10'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm text-white mb-1">
                <Zap className="w-4 h-4 text-brand-400" />
                <span>Realistic Simulator (Zero Cost)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Generates realistic DNC match responses, risk scores, and latency without consuming third-party API quotas. Ideal for staging, testing, and continuous operation.
              </p>
            </div>

            <div
              onClick={() => setConfig({ ...config, is_mock_mode: false })}
              className={`p-4 rounded-xl border cursor-pointer transition ${
                !config.is_mock_mode
                  ? 'bg-emerald-600/15 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm text-white mb-1">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Live BLA Production Endpoint</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connects directly via HTTPS to the official external BLA API endpoint using your API credentials.
              </p>
            </div>
          </div>

          {/* Simulation Slider (Only when mock mode is enabled) */}
          {config.is_mock_mode && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 mt-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">Simulated DNC Hit Rate</span>
                <span className="font-mono text-brand-400 font-bold">{config.mock_dnc_rate || 18}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={config.mock_dnc_rate || 18}
                onChange={(e) => setConfig({ ...config, mock_dnc_rate: parseInt(e.target.value, 10) })}
                className="w-full accent-brand-500 cursor-pointer"
              />
              <span className="text-[11px] text-slate-400 block">
                Approx. {config.mock_dnc_rate || 18}% of fresh numbers checked will be tagged as DNC and synced to Master DNC.
              </span>
            </div>
          )}
        </div>

        {/* Endpoint & Credentials Card */}
        <div className="p-6 rounded-2xl glass-panel border border-slate-800 space-y-4">
          <h3 className="text-base font-semibold text-white">API Connection Parameters</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Base Endpoint URL
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={config.base_url || ''}
                  onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
                  placeholder="https://api.externalbla.com/v1/dnc-check"
                  required
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs md:text-sm font-mono focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                API Key / Bearer Secret
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={config.api_key || ''}
                  onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                  placeholder="bla_live_sec_..."
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs md:text-sm font-mono focus:outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Batch Chunk Size (Numbers per HTTP Request)
                </label>
                <select
                  value={config.batch_size || 100}
                  onChange={(e) => setConfig({ ...config, batch_size: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs md:text-sm focus:outline-none focus:border-brand-500 font-mono"
                >
                  <option value="50">50 numbers / batch</option>
                  <option value="100">100 numbers / batch (Standard)</option>
                  <option value="250">250 numbers / batch (High Throughput)</option>
                  <option value="500">500 numbers / batch (Enterprise Max)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Rate Limit Throttle (Req / Sec)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={config.rate_limit_per_sec || 10}
                  onChange={(e) =>
                    setConfig({ ...config, rate_limit_per_sec: parseInt(e.target.value, 10) })
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs md:text-sm focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>BLA API settings saved and cache invalidated.</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs md:text-sm font-semibold shadow-lg shadow-brand-500/25 transition cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default ApiConfigManager;
