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
  const [deleting, setDeleting] = useState(false);

  const fetchSession = async () => {
    try {
      const res = await sessionApi.get(sessionId);
      setSession(res.data.session);
    } catch (err) {
      console.error('[SESSION DETAILS] Fetch session error:', err);
    }
  };

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
    if (!window.confirm('Delete this checking session and all its records?')) return;
    try {
      setDeleting(true);
      await sessionApi.delete(sessionId);
      onBack();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
      setDeleting(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading records..." size="lg" />;
  if (!session) {
    return (
      <div className="p-8 text-center bg-zinc-950 rounded-2xl border border-zinc-800">
        <p className="text-zinc-400 mb-4 text-sm">Session not found.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  const filterTabs = [
    { id: 'ALL', label: 'All Numbers', count: session.total_rows },
    { id: 'CLEAN', label: 'Clean Numbers', count: session.clean_count },
    { id: 'LOCAL_DNC', label: 'DNC in Database', count: session.local_dnc_count },
    { id: 'BLA_DNC', label: 'DNC from BLA', count: session.bla_dnc_count },
    { id: 'INVALID', label: 'Invalid', count: session.invalid_numbers },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition w-fit cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to List</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {session.clean_count > 0 && (
            <>
              <a
                href={sessionApi.getCleanExportUrl(sessionId, 'csv')}
                download
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Clean (CSV)</span>
              </a>

              <a
                href={sessionApi.getCleanExportUrl(sessionId, 'xlsx')}
                download
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold border border-zinc-800 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download Clean (Excel)</span>
              </a>
            </>
          )}

          <a
            href={sessionApi.getFullExportUrl(sessionId, 'csv')}
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-medium transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Full Report</span>
          </a>

          <button
            onClick={handleDeleteSession}
            disabled={deleting}
            className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/60 transition cursor-pointer ml-1"
            title="Delete Session"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Session Summary Card */}
      <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight">{session.session_name}</h2>
              <StatusBadge status={session.status} size="sm" />
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              File: {session.original_filename} · {new Date(session.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Summary Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[11px] text-zinc-400 block">Total</span>
            <span className="text-lg font-bold text-white font-mono mt-0.5 block">
              {session.total_rows?.toLocaleString() || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/40">
            <span className="text-[11px] text-emerald-400 font-medium block">Clean</span>
            <span className="text-lg font-extrabold text-emerald-400 font-mono mt-0.5 block">
              {session.clean_count?.toLocaleString() || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/40">
            <span className="text-[11px] text-amber-400 font-medium block">DNC in Database</span>
            <span className="text-lg font-bold text-amber-400 font-mono mt-0.5 block">
              {session.local_dnc_count?.toLocaleString() || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/40">
            <span className="text-[11px] text-red-400 font-medium block">DNC from BLA</span>
            <span className="text-lg font-bold text-red-400 font-mono mt-0.5 block">
              {session.bla_dnc_count?.toLocaleString() || 0}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-zinc-400 block">Money Saved</span>
            <span className="text-lg font-bold text-white font-mono mt-0.5 block">
              ${((session.api_calls_saved || 0) * 0.005).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800 overflow-x-auto">
          {filterTabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleFilterChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-500'
                    }`}
                  >
                    {tab.count.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search phone number..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
          />
        </form>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden">
        {recordsLoading ? (
          <LoadingSpinner message="Searching numbers..." />
        ) : records.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="text-[11px] uppercase tracking-wider text-zinc-400 bg-zinc-900/60 border-b border-zinc-800">
                  <tr>
                    <th className="py-3 pl-4">Phone Number (Raw)</th>
                    <th className="py-3">Standard Number</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Result Note</th>
                    <th className="py-3 pr-4 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-zinc-900/40 transition">
                      <td className="py-3 pl-4 text-zinc-300 font-medium">{rec.raw_phone}</td>
                      <td className="py-3 text-white font-semibold">{rec.normalized_phone || '—'}</td>
                      <td className="py-3 font-sans">
                        <StatusBadge status={rec.status} size="xs" />
                      </td>
                      <td className="py-3 font-sans text-zinc-400 text-xs">
                        <span>{rec.reason || 'Verified'}</span>
                      </td>
                      <td className="py-3 pr-4 text-right text-zinc-500 text-[11px]">
                        {new Date(rec.created_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 text-xs text-zinc-400 font-sans">
              <span>
                Showing {(page - 1) * pagination.limit + 1} to{' '}
                {Math.min(page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()}{' '}
                numbers
              </span>

              <div className="flex items-center gap-2 font-mono">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-white">
                  Page {page} of {pagination.totalPages || 1}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= pagination.totalPages}
                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center text-zinc-500 font-sans">
            <Info className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
            <p className="text-sm">No phone numbers found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SessionDetails;
