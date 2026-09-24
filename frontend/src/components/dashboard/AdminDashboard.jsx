import React, { useEffect, useMemo, useState } from 'react';
import { adminApi, sessionApi } from '../../services/api';
import MetricCard from '../common/MetricCard';
import StatusBadge from '../common/StatusBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import DateRangeSelector from '../common/DateRangeSelector';
import ChartTooltip from '../common/ChartTooltip';
import { formatNumber, formatCompact, formatDateShort, formatDateTime, safeRate } from '../../utils/format';
import {
  Database,
  FileCheck2,
  ShieldCheck,
  RefreshCw,
  Download,
  ArrowUpRight,
  AlertTriangle,
  Zap,
  UploadCloud,
  Inbox,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = {
  total: '#e4e4e7',
  clean: '#10b981',
  local: '#f59e0b',
  bla: '#ef4444',
  invalid: '#71717a',
  grid: '#1f1f24',
  axis: '#52525b',
};

const SOURCE_COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#a1a1aa'];

function todayRange() {
  const now = new Date();
  return {
    id: 'today',
    label: 'Today',
    startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString(),
    endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString(),
  };
}

function sourceLabel(source) {
  const map = {
    BLA_SYNC: 'BLA synced',
    MANUAL_UPLOAD: 'Uploaded',
    MANUAL_ENTRY: 'Manual entry',
    INITIAL_SEED: 'Seeded',
  };
  return map[source] || source?.replace(/^Upload_/, '') || 'Unknown';
}

function ChartCard({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`card flex flex-col p-5 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="section-title">{title}</h3>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  );
}

function ChartEmpty({ message }) {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center text-xs text-zinc-500">
      <Inbox className="h-6 w-6 text-zinc-600" />
      <span>{message}</span>
    </div>
  );
}

function LegendDot({ color, label, value, pct }) {
  return (
    <li className="flex items-center justify-between gap-3 text-xs">
      <span className="flex items-center gap-2 text-zinc-300">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="flex items-baseline gap-2">
        <span className="font-mono font-semibold text-white">{formatNumber(value)}</span>
        <span className="w-11 text-right font-mono text-zinc-500">{pct.toFixed(1)}%</span>
      </span>
    </li>
  );
}

export function AdminDashboard({ onSelectSession, onOpenNewScrub }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState(todayRange);

  const fetchAnalytics = async (selectedRange = dateRange, silent = false) => {
    try {
      if (!silent) setRefreshing(true);
      const params = {};
      if (selectedRange?.startDate) params.startDate = selectedRange.startDate;
      if (selectedRange?.endDate) params.endDate = selectedRange.endDate;
      const res = await adminApi.getAnalytics(params);
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error('[ADMIN DASHBOARD] Fetch analytics error:', err);
      setError('Could not load analytics. Check that the API is running.');
    } finally {
      setLoading(false);
      if (!silent) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(dateRange);
    const interval = setInterval(() => fetchAnalytics(dateRange, true), 30000);
    return () => clearInterval(interval);
  }, [dateRange]);

  const kpis = useMemo(() => data?.kpis || {}, [data]);
  const timeline = useMemo(() => data?.timeline || [], [data]);
  const recentSessions = data?.recentSessions || [];
  const sourceBreakdown = useMemo(() => data?.dncSourceBreakdown || [], [data]);

  const sparks = useMemo(
    () => ({
      total: timeline.map((t) => Number(t.total_leads) || 0),
      clean: timeline.map((t) => Number(t.clean_leads) || 0),
      local: timeline.map((t) => Number(t.local_dnc_leads) || 0),
      bla: timeline.map((t) => Number(t.bla_checked_leads) || 0),
    }),
    [timeline]
  );

  const breakdown = useMemo(() => {
    const items = [
      { key: 'clean', name: 'Clean', value: kpis.totalCleanLeads || 0, color: COLORS.clean },
      { key: 'local', name: 'Already in DNC', value: kpis.totalLocalDnc || 0, color: COLORS.local },
      { key: 'bla', name: 'DNC from BLA', value: kpis.totalBlaDnc || 0, color: COLORS.bla },
      { key: 'invalid', name: 'Invalid', value: kpis.totalInvalid || 0, color: COLORS.invalid },
    ];
    const total = items.reduce((a, b) => a + b.value, 0);
    return { items, total, chart: items.filter((i) => i.value > 0) };
  }, [kpis]);

  const sourceData = useMemo(
    () =>
      sourceBreakdown
        .map((s, i) => ({
          name: sourceLabel(s.source),
          value: Number(s.count) || 0,
          color: SOURCE_COLORS[i % SOURCE_COLORS.length],
        }))
        .filter((s) => s.value > 0)
        .slice(0, 6),
    [sourceBreakdown]
  );

  const rangeLabel = dateRange.id === 'today' ? 'today' : dateRange.label.toLowerCase();
  const hasDncTimeline = timeline.some((t) => Number(t.local_dnc_leads) > 0 || Number(t.bla_dnc_leads) > 0);

  if (loading) return <LoadingSpinner message="Loading dashboard…" size="lg" />;

  if (error) {
    return (
      <div className="card p-10 text-center">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-400" />
        <p className="mb-5 text-sm text-red-200">{error}</p>
        <button onClick={() => fetchAnalytics(dateRange)} className="btn-secondary">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ---------- Header ---------- */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="eyebrow">Overview</span>
          <h2 className="page-title mt-1">Compliance Dashboard</h2>
          <p className="page-subtitle">
            Lead verification, DNC suppression and Blacklist Alliance usage for{' '}
            <span className="text-zinc-200 font-medium">{dateRange.label}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          <button
            onClick={() => fetchAnalytics(dateRange)}
            disabled={refreshing}
            className="btn-secondary"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ---------- KPIs ---------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={dateRange.id === 'today' ? 'BLA Checks Today' : `BLA Checks (${dateRange.label})`}
          value={formatCompact(kpis.totalBlaChecked)}
          subtext="Verified via Blacklist Alliance API"
          icon={Zap}
          color="amber"
          badge="Live BLA"
          sparkline={sparks.bla}
        />
        <MetricCard
          title="Total Leads Checked"
          value={formatCompact(kpis.totalLeadsChecked)}
          subtext={`${formatNumber(kpis.completedSessions)} completed files`}
          icon={FileCheck2}
          color="white"
          sparkline={sparks.total}
        />
        <MetricCard
          title="Clean Numbers Found"
          value={formatCompact(kpis.totalCleanLeads)}
          subtext={`${(kpis.cleanRatePercent || 0).toFixed(1)}% clean rate`}
          icon={ShieldCheck}
          color="emerald"
          badge="Verified Safe"
          sparkline={sparks.clean}
        />
        <MetricCard
          title="DNC in Database"
          value={formatCompact(kpis.totalLocalDnc)}
          subtext="Skipped before BLA API"
          icon={Database}
          color="cyan"
          badge="Intercepted"
          sparkline={sparks.local}
        />
      </div>

      {/* ---------- Charts row 1 ---------- */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartCard
          title="Verification volume"
          subtitle="Numbers checked per day, split into clean and DNC"
          className="xl:col-span-2"
          action={
            <ul className="hidden items-center gap-4 text-[11px] text-zinc-400 sm:flex">
              {[
                ['Total', COLORS.total],
                ['Clean', COLORS.clean],
                ['DNC', COLORS.bla],
              ].map(([l, c]) => (
                <li key={l} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />
                  {l}
                </li>
              ))}
            </ul>
          }
        >
          <div className="h-72">
            {timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.total} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={COLORS.total} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gClean" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.clean} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={COLORS.clean} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gDnc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.bla} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={COLORS.bla} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke={COLORS.axis}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatDateShort}
                    minTickGap={24}
                  />
                  <YAxis
                    stroke={COLORS.axis}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCompact}
                    width={56}
                  />
                  <Tooltip
                    cursor={{ stroke: '#3f3f46', strokeDasharray: '3 3' }}
                    content={<ChartTooltip labelFormatter={formatDateShort} />}
                  />
                  <Area type="monotone" dataKey="total_leads" name="Total" stroke={COLORS.total} strokeWidth={1.75} fill="url(#gTotal)" />
                  <Area type="monotone" dataKey="clean_leads" name="Clean" stroke={COLORS.clean} strokeWidth={2} fill="url(#gClean)" />
                  <Area type="monotone" dataKey="dnc_leads" name="DNC" stroke={COLORS.bla} strokeWidth={1.75} fill="url(#gDnc)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty message={`No lead checks ${rangeLabel}. Upload a file to see trends.`} />
            )}
          </div>
        </ChartCard>

        <ChartCard title="Result breakdown" subtitle="How checked numbers were classified">
          <div className="flex h-full flex-col">
            <div className="relative h-48">
              {breakdown.chart.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={breakdown.chart}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={84}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {breakdown.chart.map((entry) => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-mono text-2xl font-bold text-white">{formatCompact(breakdown.total)}</span>
                    <span className="text-[11px] text-zinc-500">numbers</span>
                  </div>
                </>
              ) : (
                <ChartEmpty message="No results yet for this period." />
              )}
            </div>

            <ul className="mt-4 space-y-2.5 border-t border-surface-border pt-4">
              {breakdown.items.map((i) => (
                <LegendDot
                  key={i.key}
                  color={i.color}
                  label={i.name}
                  value={i.value}
                  pct={safeRate(i.value, breakdown.total)}
                />
              ))}
            </ul>
          </div>
        </ChartCard>
      </div>

      {/* ---------- Charts row 2 ---------- */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ChartCard
          title="DNC suppression by day"
          subtitle="Numbers caught locally vs. flagged by Blacklist Alliance"
          action={
            <ul className="hidden items-center gap-4 text-[11px] text-zinc-400 sm:flex">
              <li className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: COLORS.local }} /> Local DNC
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: COLORS.bla }} /> BLA DNC
              </li>
            </ul>
          }
        >
          <div className="h-64">
            {hasDncTimeline ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeline} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke={COLORS.axis}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatDateShort}
                    minTickGap={24}
                  />
                  <YAxis stroke={COLORS.axis} fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatCompact} width={56} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip labelFormatter={formatDateShort} />} />
                  <Bar dataKey="local_dnc_leads" name="Local DNC" stackId="dnc" fill={COLORS.local} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="bla_dnc_leads" name="BLA DNC" stackId="dnc" fill={COLORS.bla} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty message={`No DNC matches ${rangeLabel}.`} />
            )}
          </div>
        </ChartCard>

        <ChartCard title="Master DNC by source" subtitle="Where your suppression list comes from">
          <div className="h-64">
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
                  <XAxis type="number" stroke={COLORS.axis} fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatCompact} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke={COLORS.axis}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={104}
                    tick={{ fill: '#a1a1aa' }}
                  />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Records" radius={[0, 4, 4, 0]}>
                    {sourceData.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmpty message="Master DNC is empty. Upload a DNC list to get started." />
            )}
          </div>
        </ChartCard>
      </div>

      {/* ---------- Recent sessions ---------- */}
      <section className="card overflow-hidden">
        <header className="flex items-center justify-between gap-3 border-b border-surface-border px-5 py-4">
          <div>
            <h3 className="section-title">Recent file checks</h3>
            <p className="section-subtitle">Latest sessions {rangeLabel}</p>
          </div>
        </header>

        {recentSessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>User</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Already in DNC</th>
                  <th className="text-right">DNC from BLA</th>
                  <th className="text-right">Clean</th>
                  <th className="w-40">Clean rate</th>
                  <th className="text-center">Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((s) => {
                  const rate = safeRate(s.clean_count, s.total_rows);
                  return (
                    <tr key={s.id}>
                      <td>
                        <button
                          onClick={() => onSelectSession(s.id)}
                          className="block max-w-[220px] truncate text-left font-medium text-white hover:text-emerald-300 transition"
                        >
                          {s.session_name}
                        </button>
                        <span className="block max-w-[220px] truncate font-mono text-[11px] text-zinc-500">
                          {s.original_filename} · {formatDateTime(s.created_at)}
                        </span>
                      </td>
                      <td className="text-zinc-400">{s.user_name || s.user_email || '—'}</td>
                      <td className="text-right font-mono font-semibold text-white">{formatNumber(s.total_rows)}</td>
                      <td className="text-right">
                        {s.local_dnc_count > 0 ? (
                          <span className="chip-amber">{formatNumber(s.local_dnc_count)}</span>
                        ) : (
                          <span className="font-mono text-zinc-600">0</span>
                        )}
                      </td>
                      <td className="text-right">
                        {s.bla_dnc_count > 0 ? (
                          <span className="chip-red">{formatNumber(s.bla_dnc_count)}</span>
                        ) : (
                          <span className="font-mono text-zinc-600">0</span>
                        )}
                      </td>
                      <td className="text-right">
                        <span className="chip-emerald">{formatNumber(s.clean_count)}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-raised">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, rate)}%` }} />
                          </div>
                          <span className="w-12 text-right font-mono text-[11px] text-zinc-400">{rate.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="text-center">
                        <StatusBadge status={s.status} size="xs" />
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          {s.clean_count > 0 && (
                            <a
                              href={sessionApi.getCleanExportUrl(s.id, 'csv')}
                              download
                              className="btn-icon"
                              title="Download clean CSV"
                              aria-label="Download clean CSV"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button onClick={() => onSelectSession(s.id)} className="btn-secondary btn-sm">
                            View <ArrowUpRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-surface-border bg-surface-raised text-zinc-500">
              <Inbox className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">No file checks {rangeLabel}</p>
              <p className="mt-1 text-xs text-zinc-500">Upload a lead file to start a new verification session.</p>
            </div>
            <button onClick={onOpenNewScrub} className="btn-primary btn-sm mt-1">
              <UploadCloud className="h-3.5 w-3.5" /> Upload file
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminDashboard;
