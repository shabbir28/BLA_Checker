import React, { useEffect, useState } from 'react';
import { sessionApi } from '../../services/api';
import StatusBadge from '../common/StatusBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export function SessionDetails({ sessionId, onBack }) {
  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);

  // Filters & Pagination
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

  // Delete modal
  const [deleting, setDeleting] = useState(false);

  // Fetch session meta
  const fetchSession = async () => {
    try {
      const res = await sessionApi.get(sessionId);
      setSession(res.data.session);
    } catch (err) {
      console.error('[SESSION DETAILS] Fetch session error:', err);
    }
  };

  // Fetch records with filters
  const fetchRecords = async (targetPage = page, targetStatus = statusFilter, targetSearch = searchTerm) => {
    try {
      setRecordsLoading(true);
      const res = await sessionApi.getRecords(sessionId, {
        page: targetPage,
        limit: 50,
        status: targetStatus,
        search: targetSearch,
      });
      setRecords(res.data.data || []);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('[SESSION DETAILS] Fetch records error:', err);
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await fetchSession();
      await fetchRecords(1, 'ALL', '');
      setLoading(false);
    }
    loadData();
  }, [sessionId]);

  const handleFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
    setPage(1);
    fetchRecords(1, newStatus, searchTerm);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRecords(1, statusFilter, searchTerm);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchRecords(newPage, statusFilter, searchTerm);
  };

  const handleDeleteSession = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this checking session and all its records?')) {
      return;
    }
    try {
      setDeleting(true);
      await sessionApi.delete(sessionId);
      onBack();
    } catch (err) {
      alert('Failed to delete session: ' + (err.response?.data?.message || err.message));
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading session audit records..." size="lg" />;
  if (!session) {
    return (
      <div className="p-8 text-center glass-panel rounded-2xl">
        <p className="text-slate-400 mb-4">Session could not be loaded.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  const filterTabs = [
    { id: 'ALL', label: 'All Records', count: session.total_rows },
    { id: 'CLEAN', label: 'Clean', count: session.clean_count },
    { id: 'LOCAL_DNC', label: 'Master DNC', count: session.local_dnc_count },
    { id: 'BLA_DNC', label: 'BLA DNC', count: session.bla_dnc_count },
    { id: 'INVALID', label: 'Invalid', count: session.invalid_numbers },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sessions List</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {session.clean_count > 0 && (
            <>
              <a
                href={sessionApi.getCleanExportUrl(sessionId, 'csv')}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Clean CSV</span>
              </a>

              <a
                href={sessionApi.getCleanExportUrl(sessionId, 'xlsx')}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-md shadow-teal-500/20 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Clean XLSX</span>
              </a>
            </>
          )}

          <a
            href={sessionApi.getFullExportUrl(sessionId, 'csv')}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Full Audit (CSV)</span>
          </a>

          <button
            onClick={handleDeleteSession}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Session Summary Card */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight">{session.session_name}</h2>
              <StatusBadge status={session.status} size="sm" />
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Original File: {session.original_filename} · Created: {new Date(session.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 text-center">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Total Leads</span>
            <span className="text-lg font-bold text-white font-mono mt-0.5 block">
              {session.total_rows?.toLocaleString() || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider block">
              Clean Leads
            </span>
            <span className="text-lg font-extrabold text-emerald-400 font-mono mt-0.5 block">
              {session.clean_count?.toLocaleString() || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider block">
              Local Master DNC
            </span>
            <span className="text-lg font-bold text-amber-400 font-mono mt-0.5 block">
              {session.local_dnc_count?.toLocaleString() || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <span className="text-[11px] text-rose-400 font-semibold uppercase tracking-wider block">
              BLA Verified DNC
            </span>
            <span className="text-lg font-bold text-rose-400 font-mono mt-0.5 block">
              {session.bla_dnc_count?.toLocaleString() || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-cyan-400 font-semibold uppercase tracking-wider block">
              API Calls Saved
            </span>
            <span className="text-lg font-bold text-cyan-400 font-mono mt-0.5 block">
              {session.api_calls_saved?.toLocaleString() || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
          {filterTabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleFilterChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-brand-800 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.count.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search phone number..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </form>
      </div>

      {/* Records Table */}
      <div className="rounded-2xl glass-panel border border-slate-800 overflow-hidden">
        {recordsLoading ? (
          <LoadingSpinner message="Filtering records..." />
        ) : records.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/80 border-b border-slate-800">
                  <tr>
                    <th className="py-3 pl-4">Raw Phone</th>
                    <th className="py-3">Normalized Phone</th>
                    <th className="py-3">Compliance Status</th>
                    <th className="py-3">Scrub Reason</th>
                    <th className="py-3 pr-4 text-right">Checked At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-900/50 transition">
                      <td className="py-3 pl-4 text-slate-300 font-medium">{rec.raw_phone}</td>
                      <td className="py-3 text-slate-200 font-semibold">{rec.normalized_phone || '—'}</td>
                      <td className="py-3 font-sans">
                        <StatusBadge status={rec.status} size="xs" />
                      </td>
                      <td className="py-3 font-sans text-slate-400 text-xs">
                        <span>{rec.reason || 'Verified'}</span>
                      </td>
                      <td className="py-3 pr-4 text-right text-slate-400 text-[11px]">
                        {new Date(rec.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
              <span>
                Showing {(page - 1) * pagination.limit + 1} to{' '}
                {Math.min(page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()}{' '}
                records
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-slate-200">
                  Page {page} of {pagination.totalPages || 1}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= pagination.totalPages}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-slate-400 font-sans">
            <Info className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-300">No records match the current filter.</p>
            <p className="text-xs text-slate-400 mt-1">Try selecting a different status filter or clearing your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SessionDetails;
