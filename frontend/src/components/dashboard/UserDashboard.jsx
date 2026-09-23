import React, { useEffect, useState } from 'react';
import { sessionApi } from '../../services/api';
import MetricCard from '../common/MetricCard';
import StatusBadge from '../common/StatusBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  FileCheck2,
  ShieldCheck,
  ShieldAlert,
  Download,
  ExternalLink,
  UploadCloud,
  FileSpreadsheet,
} from 'lucide-react';

export function UserDashboard({ onSelectSession, onOpenNewScrub }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUserSessions = async () => {
    try {
      setLoading(true);
      const res = await sessionApi.list({ limit: 10 });
      setSessions(res.data.data || []);
    } catch (err) {
      console.error('[USER DASHBOARD] Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserSessions();
  }, []);

  // Compute aggregate personal metrics
  const totalLeads = sessions.reduce((acc, s) => acc + (s.total_rows || 0), 0);
  const totalClean = sessions.reduce((acc, s) => acc + (s.clean_count || 0), 0);
  const totalDnc = sessions.reduce(
    (acc, s) => acc + (s.local_dnc_count || 0) + (s.bla_dnc_count || 0),
    0
  );
  const cleanRate = totalLeads > 0 ? ((totalClean / totalLeads) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Action Hero */}
      <div className="relative overflow-hidden p-6 md:p-8 rounded-2xl glass-panel border border-slate-800 bg-gradient-to-r from-slate-900 via-brand-950/40 to-slate-900">
        <div className="relative z-10 max-w-2xl">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-300 border border-brand-500/20 mb-3 inline-block">
            Compliance Ready
          </span>
          <h2 className="text-xl md:text-3xl font-extrabold text-white tracking-tight">
            Scrub Leads Against National DNC & BLA Registry
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-2 leading-relaxed">
            Upload your contact files (CSV, XLSX, TXT) to filter out known DNC numbers. Clean verified leads are instantly available for download.
          </p>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={onOpenNewScrub}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs md:text-sm font-semibold shadow-lg shadow-brand-500/25 transition cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Start New Checking Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Leads Checked"
          value={totalLeads.toLocaleString()}
          subtext="Across all your sessions"
          icon={FileCheck2}
          color="brand"
        />

        <MetricCard
          title="Clean Numbers Verified"
          value={totalClean.toLocaleString()}
          subtext="Ready for outreach"
          icon={ShieldCheck}
          color="emerald"
        />

        <MetricCard
          title="DNC Numbers Flagged"
          value={totalDnc.toLocaleString()}
          subtext="TCPA violations prevented"
          icon={ShieldAlert}
          color="rose"
        />

        <MetricCard
          title="Average Clean Rate"
          value={`${cleanRate}%`}
          subtext="Clean leads verified"
          icon={FileSpreadsheet}
          color="cyan"
        />
      </div>

      {/* Recent Sessions Table with One-Click Downloads */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Your Lead Scrubbing History</h3>
            <p className="text-xs text-slate-400">Download clean numbers or inspect detailed audit results</p>
          </div>
          <button
            onClick={fetchUserSessions}
            className="text-xs text-brand-400 hover:text-brand-300 transition"
          >
            Refresh List
          </button>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading your sessions..." />
        ) : sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="pb-3 pl-2">Session Name</th>
                  <th className="pb-3 text-right">Total Leads</th>
                  <th className="pb-3 text-right">Clean Leads</th>
                  <th className="pb-3 text-right">DNC Matched</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-right">Date</th>
                  <th className="pb-3 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-900/50 transition">
                    <td className="py-3 pl-2 font-sans font-medium text-slate-200">
                      <div>
                        <span>{session.session_name}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">
                          {session.original_filename}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-right text-slate-200 font-bold">
                      {session.total_rows?.toLocaleString() || 0}
                    </td>
                    <td className="py-3 text-right text-emerald-400 font-bold">
                      {session.clean_count?.toLocaleString() || 0}
                    </td>
                    <td className="py-3 text-right text-rose-400">
                      {((session.local_dnc_count || 0) + (session.bla_dnc_count || 0)).toLocaleString()}
                    </td>
                    <td className="py-3 text-center font-sans">
                      <StatusBadge status={session.status} size="xs" />
                    </td>
                    <td className="py-3 text-right text-slate-400 text-[11px]">
                      {new Date(session.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-2 text-right font-sans">
                      <div className="flex items-center justify-end gap-2">
                        {session.clean_count > 0 && (
                          <a
                            href={sessionApi.getCleanExportUrl(session.id, 'csv')}
                            download
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition text-xs"
                            title="Download Clean CSV"
                          >
                            <Download className="w-3 h-3" />
                            <span>Clean CSV</span>
                          </a>
                        )}
                        <button
                          onClick={() => onSelectSession(session.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-brand-600/20 hover:text-brand-300 text-slate-300 border border-slate-700/60 transition text-xs"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-slate-400">
            <p className="text-sm">You haven't run any lead checks yet.</p>
            <button
              onClick={onOpenNewScrub}
              className="mt-3 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition"
            >
              Upload Your First File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserDashboard;
