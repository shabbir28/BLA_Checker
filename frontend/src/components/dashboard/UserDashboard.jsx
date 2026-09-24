import React, { useEffect, useState } from 'react';
import { sessionApi } from '../../services/api';
import MetricCard from '../common/MetricCard';
import StatusBadge from '../common/StatusBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import DateRangeSelector from '../common/DateRangeSelector';
import {
  FileCheck,
  ShieldCheck,
  Download,
  ExternalLink,
  Zap,
  Database,
  RefreshCw,
} from 'lucide-react';

export function UserDashboard({ onSelectSession, onOpenNewScrub }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    return {
      id: 'today',
      label: 'Today',
      startDate: start,
      endDate: end,
    };
  });

  const fetchUserSessions = async (selectedRange = dateRange) => {
    try {
      setLoading(true);
      const params = { limit: 50 };
      if (selectedRange?.startDate) params.startDate = selectedRange.startDate;
      if (selectedRange?.endDate) params.endDate = selectedRange.endDate;

      const res = await sessionApi.list(params);
      setSessions(res.data.data || []);
    } catch (err) {
      console.error('[USER DASHBOARD] Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  // The effect below reacts to dateRange, so the handler only needs to update state.
  useEffect(() => {
    fetchUserSessions(dateRange);
  }, [dateRange]);

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
  };

  // Filter sessions according to selected range
  const filteredSessions = sessions.filter((s) => {
    if (!dateRange.startDate || !dateRange.endDate) return true;
    const sessionTime = new Date(s.created_at).getTime();
    const startTime = new Date(dateRange.startDate).getTime();
    const endTime = new Date(dateRange.endDate).getTime();
    return sessionTime >= startTime && sessionTime <= endTime;
  });

  const totalLeads = filteredSessions.reduce((acc, s) => acc + (s.total_rows || 0), 0);
  const totalClean = filteredSessions.reduce((acc, s) => acc + (s.clean_count || 0), 0);
  const totalLocalDnc = filteredSessions.reduce((acc, s) => acc + (s.local_dnc_count || 0), 0);
  const totalBlaChecked = filteredSessions.reduce(
    (acc, s) => acc + (s.clean_count || 0) + (s.bla_dnc_count || 0),
    0
  );
  const cleanRate = totalLeads > 0 ? ((totalClean / totalLeads) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner with Date Selector & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-950 border border-zinc-800">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">User Dashboard</h2>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Track your verified lead batches, clean numbers, and Blacklist Alliance API checks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <DateRangeSelector value={dateRange} onChange={handleDateRangeChange} />

          <button
            onClick={() => fetchUserSessions(dateRange)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Numbers Checked via BLA */}
        <MetricCard
          title={dateRange.id === 'today' ? 'BLA Checks Today' : `BLA Checks (${dateRange.label})`}
          value={totalBlaChecked.toLocaleString()}
          subtext="Verified via Blacklist Alliance API"
          icon={Zap}
          color="amber"
          badge="Live BLA"
        />

        {/* KPI 2: Total Numbers Checked */}
        <MetricCard
          title="Total Leads Checked"
          value={totalLeads.toLocaleString()}
          subtext="From your uploaded files"
          icon={FileCheck}
          color="white"
        />

        {/* KPI 3: Fresh Clean Numbers */}
        <MetricCard
          title="Clean Numbers Found"
          value={totalClean.toLocaleString()}
          subtext={`${cleanRate}% clean rate`}
          icon={ShieldCheck}
          color="emerald"
          badge="Verified"
        />

        {/* KPI 4: Already in DNC Database */}
        <MetricCard
          title="DNC in Database"
          value={totalLocalDnc.toLocaleString()}
          subtext="Pre-filtered before BLA API"
          icon={Database}
          color="cyan"
          badge="Intercepted"
        />
      </div>

      {/* Recent Files Table */}
      <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Your Recent Files</h3>
            <p className="text-xs text-zinc-400">Download your clean phone numbers</p>
          </div>
          <button
            onClick={() => fetchUserSessions(dateRange)}
            className="text-xs text-zinc-400 hover:text-white transition"
          >
            Refresh List
          </button>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading files..." />
        ) : filteredSessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-800 bg-zinc-900/40">
                <tr>
                  <th className="py-3 pl-3">Session Name</th>
                  <th className="py-3 text-right">Total Numbers</th>
                  <th className="py-3 text-right">Already in DNC</th>
                  <th className="py-3 text-right">DNC from BLA</th>
                  <th className="py-3 text-right">Fresh Numbers</th>
                  <th className="py-3 text-center">Status</th>
                  <th className="py-3 text-right">Date</th>
                  <th className="py-3 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 font-mono">
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-zinc-900/50 transition">
                    <td className="py-3 pl-3 font-sans font-medium text-white">
                      <div>
                        <span>{session.session_name}</span>
                        <span className="block text-[10px] text-zinc-500 font-mono">
                          {session.original_filename}
                        </span>
                      </div>
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
                    <td className="py-3 text-right text-zinc-500 text-[11px]">
                      {new Date(session.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-2">
                        {session.clean_count > 0 && (
                          <a
                            href={sessionApi.getCleanExportUrl(session.id, 'csv')}
                            download
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 text-xs font-semibold transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Clean</span>
                          </a>
                        )}
                        <button
                          onClick={() => onSelectSession(session.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs transition cursor-pointer"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-zinc-500">
            <p className="text-sm">
              {sessions.length === 0
                ? "You haven't checked any files yet."
                : `No files found for ${dateRange.label}.`}
            </p>
            <button
              onClick={onOpenNewScrub}
              className="mt-3 px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-xl text-xs font-bold transition"
            >
              Upload a File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserDashboard;
