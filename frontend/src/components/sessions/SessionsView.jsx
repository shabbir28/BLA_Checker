import React, { useEffect, useState, useCallback } from 'react';
import { sessionApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../common/StatusBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';
import {
  Layers,
  UploadCloud,
  RefreshCw,
  Search,
  Download,
  Eye,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertTriangle,
  Clock,
  User,
} from 'lucide-react';

export function SessionsView({ onSelectSession, onOpenNewScrub }) {
  const { isAdmin, user } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [scopeFilter, setScopeFilter] = useState(isAdmin ? 'all' : 'mine');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Delete modal state
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const fetchSessions = useCallback(
    async (isSilent = false) => {
      try {
        if (!isSilent) setRefreshing(true);
        const params = {
          page,
          limit: 15,
        };
        if (isAdmin && scopeFilter === 'all') {
          params.scope = 'all';
        }
        const res = await sessionApi.list(params);
        setSessions(res.data.data || []);
        setPagination(
          res.data.pagination || {
            page: 1,
            limit: 15,
            total: res.data.data?.length || 0,
            totalPages: 1,
          }
        );
      } catch (err) {
        console.error('[SESSIONS] Fetch error:', err);
      } finally {
        setLoading(false);
        if (!isSilent) setRefreshing(false);
      }
    },
    [page, scopeFilter, isAdmin]
  );

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Auto-refresh when any session is processing
  useEffect(() => {
    const hasActive = sessions.some(
      (s) => s.status === 'PROCESSING' || s.status === 'QUEUED'
    );
    if (!hasActive) return;

    const timer = setInterval(() => {
      fetchSessions(true);
    }, 4000);

    return () => clearInterval(timer);
  }, [sessions, fetchSessions]);

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await sessionApi.delete(sessionToDelete.id);
      setSessionToDelete(null);
      await fetchSessions();
    } catch (err) {
      console.error('[SESSIONS] Delete error:', err);
      setDeleteError(err.response?.data?.message || 'Failed to delete session.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered sessions by search and status
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      !search ||
      s.session_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.original_filename?.toLowerCase().includes(search.toLowerCase()) ||
      s.id?.toString().includes(search);

    const matchesStatus =
      statusFilter === 'ALL' || s.status?.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  // Calculate summary counts
  const totalChecked = sessions.reduce((acc, s) => acc + (s.total_rows || 0), 0);
  const totalClean = sessions.reduce((acc, s) => acc + (s.clean_count || 0), 0);
  const totalDnc = sessions.reduce(
    (acc, s) => acc + (s.local_dnc_count || 0) + (s.bla_dnc_count || 0),
    0
  );

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-950 border border-zinc-800">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Sessions</h2>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Every file you upload is saved here as a session. Track progress, view details, and download clean leads anytime.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchSessions()}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onOpenNewScrub}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition shadow-md shadow-white/5 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-black" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs">Total Sessions</span>
            <Layers className="w-4 h-4 text-zinc-500" />
          </div>
          <span className="text-2xl font-bold text-white font-mono">
            {pagination.total || sessions.length}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-1">Saved file uploads</span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs">Numbers Checked</span>
            <FileSpreadsheet className="w-4 h-4 text-zinc-500" />
          </div>
          <span className="text-2xl font-bold text-white font-mono">
            {totalChecked.toLocaleString()}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-1">Total leads processed</span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs">Clean Numbers</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-bold text-emerald-400 font-mono">
            {totalClean.toLocaleString()}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-1">Safe to call</span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs">DNC Blocked</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <span className="text-2xl font-bold text-red-400 font-mono">
            {totalDnc.toLocaleString()}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-1">Removed from lists</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by file name or session name..."
              className="w-full pl-10 pr-4 py-2 bg-black border border-zinc-800 rounded-xl text-xs md:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-black border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-zinc-500 transition"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PROCESSING">Processing</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {/* Admin Scope Toggle */}
        {isAdmin && (
          <div className="flex items-center gap-1 bg-black p-1 rounded-xl border border-zinc-800 self-start md:self-auto">
            <button
              onClick={() => {
                setScopeFilter('all');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                scopeFilter === 'all'
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All Users' Sessions
            </button>
            <button
              onClick={() => {
                setScopeFilter('mine');
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                scopeFilter === 'mine'
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              My Sessions
            </button>
          </div>
        )}
      </div>

      {/* Sessions Table */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <LoadingSpinner message="Loading sessions..." size="md" />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
              <Layers className="w-7 h-7 text-zinc-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No sessions found</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                {search || statusFilter !== 'ALL'
                  ? 'No sessions matched your filter criteria.'
                  : 'Upload your first CSV, Excel, or TXT lead file to check numbers against DNC and see your session saved here.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={onOpenNewScrub}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition shadow-md shadow-white/5 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-black" />
                <span>Upload File Now</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 uppercase tracking-wider text-[10px] font-mono">
                <tr>
                  <th className="py-3 px-4">Session & File</th>
                  <th className="py-3 px-4">Upload Date</th>
                  {isAdmin && scopeFilter === 'all' && <th className="py-3 px-4">Uploader</th>}
                  <th className="py-3 px-4 text-right">Total Leads</th>
                  <th className="py-3 px-4 text-right">Clean Leads</th>
                  <th className="py-3 px-4 text-right">DNC Found</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredSessions.map((session) => {
                  const dncCount = (session.local_dnc_count || 0) + (session.bla_dnc_count || 0);
                  const isProcessing =
                    session.status === 'PROCESSING' || session.status === 'QUEUED';

                  return (
                    <tr
                      key={session.id}
                      className="hover:bg-zinc-900/40 transition group"
                    >
                      {/* Session Name & File */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300">
                            <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => onSelectSession(session.id)}
                              className="font-semibold text-white hover:text-emerald-400 transition truncate block text-left cursor-pointer"
                            >
                              {session.session_name || session.original_filename || `Session #${session.id}`}
                            </button>
                            <span className="text-[11px] text-zinc-500 truncate block font-mono">
                              {session.original_filename}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{formatDate(session.created_at)}</span>
                        </div>
                      </td>

                      {/* Uploader (Admin) */}
                      {isAdmin && scopeFilter === 'all' && (
                        <td className="py-3.5 px-4 text-zinc-300 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-zinc-500" />
                            <span className="truncate max-w-[120px]">
                              {session.user_name || session.user_email || 'Unknown'}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Total Leads */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-zinc-200">
                        {(session.total_rows || 0).toLocaleString()}
                      </td>

                      {/* Clean Leads */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 font-mono font-semibold text-[11px] border border-emerald-800/40">
                          {(session.clean_count || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* DNC Blocked */}
                      <td className="py-3.5 px-4 text-right">
                        {dncCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-950/80 text-red-400 font-mono font-semibold text-[11px] border border-red-800/40">
                            {dncCount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-zinc-600 font-mono">0</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <StatusBadge status={session.status} />
                        {isProcessing && (
                          <span className="block text-[10px] text-zinc-500 mt-0.5 font-mono">
                            {session.progress_percent || 0}%
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Download Clean Button */}
                          {session.status === 'COMPLETED' && (
                            <a
                              href={sessionApi.getCleanExportUrl(session.id, 'csv')}
                              download
                              title="Download Clean Leads (CSV)"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800/50 font-semibold text-[11px] transition shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Clean</span>
                            </a>
                          )}

                          {/* View Details */}
                          <button
                            onClick={() => onSelectSession(session.id)}
                            title="View Session Details"
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Session */}
                          <button
                            onClick={() => setSessionToDelete(session)}
                            title="Delete Session"
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-800/50 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-zinc-800 text-xs text-zinc-400">
            <span>
              Showing {((page - 1) * pagination.limit) + 1} to{' '}
              {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} sessions
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-800 transition"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-300" />
              </button>
              <span className="font-mono px-2 text-white">
                {page} / {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-800 transition"
              >
                <ChevronRight className="w-4 h-4 text-zinc-300" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <Modal
          isOpen={!!sessionToDelete}
          onClose={() => setSessionToDelete(null)}
          title="Delete Checking Session"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-950/30 border border-red-900/50 text-red-300 text-xs">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span>
                Are you sure you want to delete session <strong>#{sessionToDelete.id}</strong> (
                {sessionToDelete.session_name || sessionToDelete.original_filename})?
              </span>
            </div>

            <p className="text-xs text-zinc-400">
              This will permanently remove this session and all its associated records. Clean downloads for this file will no longer be available.
            </p>

            {deleteError && (
              <div className="p-3 rounded-lg bg-red-950 border border-red-900 text-red-300 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSessionToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSession}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition cursor-pointer shadow-md shadow-red-950 flex items-center gap-1.5"
              >
                {deleting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Session</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default SessionsView;
