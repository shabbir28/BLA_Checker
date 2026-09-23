import React, { useEffect, useState } from 'react';
import { adminApi, sessionApi } from '../../services/api';
import MetricCard from '../common/MetricCard';
import StatusBadge from '../common/StatusBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import DateRangeSelector from '../common/DateRangeSelector';
import {
  Database,
  FileCheck,
  ShieldCheck,
  RefreshCw,
  Download,
  ExternalLink,
  FileSpreadsheet,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export function AdminDashboard({ onSelectSession }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Initialize with Today matching Image 2
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      id: 'today',
      label: 'Today',
      startDate: `${today}T00:00:00.000Z`,
      endDate: `${today}T23:59:59.999Z`,
    };
  });

  const fetchAnalytics = async (selectedRange = dateRange) => {
    try {
      setRefreshing(true);
      const params = {};
      if (selectedRange?.startDate) params.startDate = selectedRange.startDate;
      if (selectedRange?.endDate) params.endDate = selectedRange.endDate;

      const res = await adminApi.getAnalytics(params);
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error('[ADMIN DASHBOARD] Fetch analytics error:', err);
      setError('Could not load analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(dateRange);
    const interval = setInterval(() => fetchAnalytics(dateRange), 30000);
    return () => clearInterval(interval);
  }, [dateRange]);

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
    fetchAnalytics(newRange);
  };

  if (loading) return <LoadingSpinner message="Loading dashboard..." size="lg" />;
  if (error) {
    return (
      <div className="p-8 text-center bg-zinc-950 rounded-2xl border border-red-900/50">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-red-300 text-sm mb-4">{error}</p>
        <button
          onClick={() => fetchAnalytics(dateRange)}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const timeline = data?.timeline || [];
  const recentSessions = data?.recentSessions || [];

  const pieData = [
    { name: 'Clean Numbers', value: kpis.totalCleanLeads || 0, color: '#10b981' },
    { name: 'DNC Numbers', value: kpis.totalDncMatched || 0, color: '#ef4444' },
  ].filter((item) => item.value > 0);

  const displayPieData =
    pieData.length > 0
      ? pieData
      : [
          { name: 'Clean Numbers', value: 80, color: '#10b981' },
          { name: 'DNC Numbers', value: 20, color: '#ef4444' },
        ];

  return (
    <div className="space-y-6">
      {/* Top Banner with Date Selector & Refresh (Matching Image 2) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-950 border border-zinc-800">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Admin Dashboard</h2>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Real-time analytics for BLA compliance verification, lead files, and DNC suppression.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Custom Date Range Dropdown Selector */}
          <DateRangeSelector value={dateRange} onChange={handleDateRangeChange} />

          <button
            onClick={() => fetchAnalytics(dateRange)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4 Core KPI Cards with BLA Checked Count */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: BLA Numbers Checked for Selected Date / Today */}
        <MetricCard
          title={dateRange.id === 'today' ? 'BLA Checks Today' : `BLA Checks (${dateRange.label})`}
          value={kpis.totalBlaChecked?.toLocaleString() || '0'}
          subtext="Verified via Blacklist Alliance API"
          icon={Zap}
          color="amber"
          badge="Live BLA"
        />

        {/* KPI 2: Total Leads Checked */}
        <MetricCard
          title="Total Leads Checked"
          value={kpis.totalLeadsChecked?.toLocaleString() || '0'}
          subtext={`${kpis.completedSessions || 0} completed files`}
          icon={FileCheck}
          color="white"
        />

        {/* KPI 3: Fresh Clean Numbers */}
        <MetricCard
          title="Clean Numbers Found"
          value={kpis.totalCleanLeads?.toLocaleString() || '0'}
          subtext={`${kpis.cleanRatePercent || 0}% clean rate`}
          icon={ShieldCheck}
          color="emerald"
          badge="Verified Safe"
        />

        {/* KPI 4: Already in DNC Database */}
        <MetricCard
          title="DNC in Database"
          value={kpis.totalLocalDnc?.toLocaleString() || '0'}
          subtext="Skipped before BLA API"
          icon={Database}
          color="cyan"
          badge="Intercepted"
        />
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-zinc-950 border border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Daily Checked Leads</h3>
              <p className="text-xs text-zinc-400">Total numbers vs clean numbers found over time</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white" />
                <span className="text-zinc-400">Total</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-zinc-400">Clean</span>
              </div>
            </div>
          </div>

          <div className="h-60 w-full">
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffffff" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="cleanColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" />
                  <XAxis dataKey="day" stroke="#52525b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#09090b',
                      borderColor: '#27272a',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total_leads"
                    stroke="#ffffff"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#totalColor)"
                  />
                  <Area
                    type="monotone"
                    dataKey="clean_leads"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#cleanColor)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs">
                <span>No lead checks in the last 30 days. Upload a file to see trends.</span>
              </div>
            )}
          </div>
        </div>

        {/* Clean vs DNC Ratio */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Clean vs DNC Breakdown</h3>
            <p className="text-xs text-zinc-400">Ratio of verified clean numbers vs DNC matches</p>
          </div>

          <div className="h-52 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {displayPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#09090b" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090b',
                    borderColor: '#27272a',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={32}
                  formatter={(val) => <span className="text-xs text-zinc-300">{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <p className="text-center text-[11px] text-zinc-500 pt-2 border-t border-zinc-800">
            DNC numbers found via BLA API are automatically saved to your DNC list.
          </p>
        </div>
      </div>

      {/* Recent Checks Table */}
      <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Recent File Checks</h3>
            <p className="text-xs text-zinc-400">Recently processed lead files</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-800 bg-zinc-900/40">
              <tr>
                <th className="py-3 pl-3">Session Name</th>
                <th className="py-3">User</th>
                <th className="py-3 text-right">Total Numbers</th>
                <th className="py-3 text-right">Already in DNC</th>
                <th className="py-3 text-right">DNC from BLA</th>
                <th className="py-3 text-right">Fresh Numbers</th>
                <th className="py-3 text-center">Status</th>
                <th className="py-3 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 font-mono">
              {recentSessions.length > 0 ? (
                recentSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-zinc-900/50 transition">
                    <td className="py-3 pl-3 font-sans font-medium text-white">
                      <div>
                        <span>{session.session_name}</span>
                        <span className="block text-[10px] text-zinc-500 font-mono">
                          {session.original_filename}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 font-sans text-zinc-300">
                      {session.user_name || session.user_email || 'Admin'}
                    </td>
                    <td className="py-3 text-right text-white font-bold">
                      {session.total_rows?.toLocaleString() || 0}
                    </td>
                    <td className="py-3 text-right">
                      {(session.local_dnc_count || 0) > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-400 font-mono font-semibold text-[11px] border border-amber-800/40">
                          {session.local_dnc_count.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-zinc-600 font-mono">0</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {(session.bla_dnc_count || 0) > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-950/80 text-red-400 font-mono font-semibold text-[11px] border border-red-800/40">
                          {session.bla_dnc_count.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-zinc-600 font-mono">0</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 font-mono font-semibold text-[11px] border border-emerald-800/40">
                        {session.clean_count?.toLocaleString() || 0}
                      </span>
                    </td>
                    <td className="py-3 text-center font-sans">
                      <StatusBadge status={session.status} size="xs" />
                    </td>
                    <td className="py-3 pr-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-2">
                        {session.clean_count > 0 && (
                          <a
                            href={sessionApi.getCleanExportUrl(session.id, 'csv')}
                            download
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 text-[11px] font-semibold transition"
                            title="Download Clean CSV"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download Clean</span>
                          </a>
                        )}
                        <button
                          onClick={() => onSelectSession(session.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px] transition cursor-pointer"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-zinc-500 font-sans">
                    No lead files checked yet. Click "Upload File" above to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
