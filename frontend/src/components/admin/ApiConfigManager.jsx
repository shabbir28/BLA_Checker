import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  Globe,
  Key,
  Zap,
  Save,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';

export function ApiConfigManager() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

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
      setError(err.response?.data?.message || 'Failed to update settings.');
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

  if (loading) return <LoadingSpinner message="Loading API settings..." size="lg" />;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-950 border border-zinc-800">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">API Settings</h2>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Configure external BLA API credentials, rate limits, and test your connection.
          </p>
        </div>

        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-800 transition cursor-pointer"
        >
          <Radio className={`w-4 h-4 text-emerald-400 ${testing ? 'animate-ping' : ''}`} />
          <span>{testing ? 'Testing Latency...' : 'Test Connection'}</span>
        </button>
      </div>

      {/* Ping Result */}
      {testResult && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-3 ${
            testResult.success
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : 'bg-red-950/40 border-red-800/60 text-red-300'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          )}
          <div className="flex-1">
            <span className="font-bold">
              {testResult.success ? 'Connection Successful' : 'Connection Failed'}
            </span>
            {testResult.latencyMs !== undefined && (
              <span className="ml-2 font-mono text-[11px] px-2 py-0.5 rounded bg-black/40 border border-current">
                {testResult.latencyMs}ms
              </span>
            )}
            <p className="mt-0.5 opacity-90">{testResult.message}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Mode Selector */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Mode of Operation</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full border border-zinc-800 bg-zinc-900 font-mono text-zinc-300">
              {config.is_mock_mode ? 'SIMULATION' : 'LIVE PRODUCTION'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => setConfig({ ...config, is_mock_mode: true })}
              className={`p-4 rounded-xl border cursor-pointer transition ${
                config.is_mock_mode
                  ? 'bg-zinc-900 border-white text-white'
                  : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm mb-1 text-white">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Simulation Mode (Free)</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Simulates real BLA API checks without calling external paid endpoints. Fast, deterministic, and free.
              </p>
            </div>

            <div
              onClick={() => setConfig({ ...config, is_mock_mode: false })}
              className={`p-4 rounded-xl border cursor-pointer transition ${
                !config.is_mock_mode
                  ? 'bg-zinc-900 border-white text-white'
                  : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm mb-1 text-white">
                <Globe className="w-4 h-4 text-white" />
                <span>Live BLA API (Production)</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Sends live requests to your official external BLA API endpoint using your API Key.
              </p>
            </div>
          </div>
        </div>

        {/* Credentials */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
          <h3 className="text-sm font-bold text-white">API Connection Details</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                API Endpoint URL
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  value={config.base_url || ''}
                  onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
                  placeholder="https://api.externalbla.com/v1/dnc-check"
                  required
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                API Key
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={config.api_key || ''}
                  onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
                  placeholder="Enter API key"
                  className="w-full pl-9 pr-10 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono focus:outline-none focus:border-white"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Batch Size (Numbers / Request)
                </label>
                <select
                  value={config.batch_size || 100}
                  onChange={(e) => setConfig({ ...config, batch_size: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-white font-mono"
                >
                  <option value="50">50</option>
                  <option value="100">100 (Standard)</option>
                  <option value="250">250</option>
                  <option value="500">500 (Max)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Requests Per Second
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={config.rate_limit_per_sec || 10}
                  onChange={(e) =>
                    setConfig({ ...config, rate_limit_per_sec: parseInt(e.target.value, 10) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
            {error}
          </div>
        )}

        {saveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Settings saved successfully.</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs md:text-sm font-bold transition shadow-md shadow-white/5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default ApiConfigManager;
