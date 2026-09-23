import React, { useEffect, useState } from 'react';
import { sessionApi } from '../../services/api';
import MetricCard from '../common/MetricCard';
import StatusBadge from '../common/StatusBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  FileCheck,
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

  const totalLeads = sessions.reduce((acc, s) => acc + (s.total_rows || 0), 0);
  const totalClean = sessions.reduce((acc, s) => acc + (s.clean_count || 0), 0);
  const totalDnc = sessions.reduce(
    (acc, s) => acc + (s.local_dnc_count || 0) + (s.bla_dnc_count || 0),
    0
  );
  const cleanRate = totalLeads > 0 ? ((totalClean / totalLeads) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Upload File Callout Box */}
      <div className="p-6 md:p-8 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center mx-auto shadow-lg shadow-black">
            <UploadCloud className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Check Your Leads for DNC Compliance
            </h2>
            <p className="text-xs md:text-sm text-zinc-400 mt-1">
              Upload your CSV, Excel, or TXT file. We will remove all DNC numbers so you can download a clean, safe calling list.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onOpenNewScrub}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-sm font-bold shadow-lg shadow-white/10 transition cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-black" />
              <span>Upload Lead File</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Numbers Checked"
          value={totalLeads.toLocaleString()}
          subtext="From your uploaded files"
          icon={FileCheck}
          color="white"
        />

        <MetricCard
          title="Clean Numbers Found"
          value={totalClean.toLocaleString()}
          subtext="Safe to call"
          icon={ShieldCheck}
          color="emerald"
          badge="Verified"
        />

        <MetricCard
          title="DNC Numbers Blocked"
          value={totalDnc.toLocaleString()}
          subtext="Do Not Call numbers filtered"
          icon={ShieldAlert}
          color="red"
          badge="Blocked"
        />

        <MetricCard
          title="Clean Rate"
          value={`${cleanRate}%`}
          subtext="Percentage of clean leads"
          icon={FileSpreadsheet}
          color="cyan"
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
            onClick={fetchUserSessions}
            className="text-xs text-zinc-400 hover:text-white transition"
          >
            Refresh List
          </button>
        </div>

        {loading ? (
          <LoadingSpinner message="Loading files..." />
        ) : sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-zinc-400 border-b border-zinc-800 bg-zinc-900/40">
                <tr>
                  <th className="py-3 pl-3">Session Name</th>
                  <th className="py-3 text-right">Total Numbers</th>
                  <th className="py-3 text-right">Clean Numbers</th>
                  <th className="py-3 text-right">DNC Blocked</th>
                  <th className="py-3 text-center">Status</th>
                  <th className="py-3 text-right">Date</th>
                  <th className="py-3 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80 font-mono">
                {sessions.map((session) => (
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
                    <td className="py-3 text-right text-emerald-400 font-bold">
                      {session.clean_count?.toLocaleString() || 0}
                    </td>
                    <td className="py-3 text-right text-red-400">
                      {((session.local_dnc_count || 0) + (session.bla_dnc_count || 0)).toLocaleString()}
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
            <p className="text-sm">You haven't checked any files yet.</p>
            <button
              onClick={onOpenNewScrub}
              className="mt-3 px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-xl text-xs font-bold transition"
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
