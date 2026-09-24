import React, { useEffect, useState, useCallback } from 'react';
import { sessionApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../common/StatusBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';
import EmptyState from '../common/EmptyState';
import { formatNumber, formatDateTime } from '../../utils/format';
import {
  Layers,
  UploadCloud,
  RefreshCw,
  Search,
  Download,
  Eye,
  Trash2,
  FileSpreadsheet,
  ShieldCheck,
  ShieldAlert,
  Database,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

function SummaryTile({ icon: Icon, label, value, hint, tone = 'zinc' }) {
  const tones = {
    zinc: 'text-white',
    amber: 'text-amber-300',
    red: 'text-red-300',
    emerald: 'text-emerald-300',
  };
  return (
    <div className="card card-hover p-4">
      <div className="flex items-center justify-between text-zinc-500">
        <span className="text-[11px] font-medium">{label}</span>
        <Icon className={`h-3.5 w-3.5 ${tone === 'zinc' ? 'text-zinc-500' : tones[tone]}`} />
      </div>
      <span className={`mt-1.5 block font-mono text-xl font-bold leading-none ${tones[tone]}`}>{value}</span>
      <span className="mt-1.5 block text-[11px] text-zinc-600">{hint}</span>
    </div>
  );
}

export function SessionsView({ onSelectSession, onOpenNewScrub }) {
  const { isAdmin } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [scopeFilter, setScopeFilter] = useState(isAdmin ? 'all' : 'mine');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const fetchSessions = useCallback(
    async (isSilent = false) => {
      try {
        if (!isSilent) setRefreshing(true);
        const params = { page, limit: 15 };
        if (isAdmin && scopeFilter === 'all') params.scope = 'all';
        const res = await sessionApi.list(params);
        setSessions(res.data.data || []);
        setPagination(res.data.pagination || { page: 1, limit: 15, total: res.data.data?.length || 0, totalPages: 1 });
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

  useEffect(() => {
    const hasActive = sessions.some((s) => s.status === 'PROCESSING' || s.status === 'QUEUED');
    if (!hasActive) return undefined;
    const timer = setInterval(() => fetchSessions(true), 4000);
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

  const filteredSessions = sessions.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      s.session_name?.toLowerCase().includes(q) ||
      s.original_filename?.toLowerCase().includes(q) ||
      s.id?.toString().includes(q);
    const matchesStatus = statusFilter === 'ALL' || s.status?.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totals = sessions.reduce(
    (acc, s) => ({
      checked: acc.checked + (s.total_rows || 0),
      clean: acc.clean + (s.clean_count || 0),
      local: acc.local + (s.local_dnc_count || 0),
      bla: acc.bla + (s.bla_dnc_count || 0),
    }),
    { checked: 0, clean: 0, local: 0, bla: 0 }
  );

  const showUploader = isAdmin && scopeFilter === 'all';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="eyebrow">History</span>
          <h2 className="page-title mt-1">Sessions</h2>
          <p className="page-subtitle">Every uploaded file is saved as a session. Track progress and download clean lists anytime.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchSessions()} disabled={refreshing} className="btn-icon" title="Refresh" aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={onOpenNewScrub} className="btn-primary">
            <UploadCloud className="h-4 w-4" /> Upload file
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <SummaryTile icon={Layers} label="Sessions" value={formatNumber(pagination.total || sessions.length)} hint="Saved files" />
        <SummaryTile icon={FileSpreadsheet} label="Leads on this page" value={formatNumber(totals.checked)} hint="Uploaded numbers" />
        <SummaryTile icon={Database} label="Already in DNC" value={formatNumber(totals.local)} hint="Skipped BLA API" tone="amber" />
        <SummaryTile icon={ShieldAlert} label="DNC from BLA" value={formatNumber(totals.bla)} hint="Added to Master DNC" tone="red" />
        <SummaryTile icon={ShieldCheck} label="Clean numbers" value={formatNumber(totals.clean)} hint="Safe to dial" tone="emerald" />
      </div>

      <div className="card flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by session or file name…"
              className="input input-with-icon py-2"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select w-full py-2 sm:w-44">
            <option value="ALL">All statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PROCESSING">Processing</option>
            <option value="QUEUED">Queued</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-1 self-start rounded-xl border border-surface-border bg-surface-raised p-1 md:self-auto">
            {[
              ['all', 'All users'],
              ['mine', 'Mine'],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  setScopeFilter(id);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  scopeFilter === id ? 'bg-surface-card text-white shadow-sm ring-1 ring-surface-border-strong' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <section className="card overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Loading sessions…" />
        ) : filteredSessions.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No sessions found"
            description={
              search || statusFilter !== 'ALL'
                ? 'No sessions matched your filters.'
                : 'Upload your first CSV, Excel or TXT lead file to see it here.'
            }
            actionLabel={!search && statusFilter === 'ALL' ? 'Upload a file' : undefined}
            onAction={onOpenNewScrub}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-fixed w-full min-w-[820px] [&_td]:!px-3 [&_th]:!px-3">
              <colgroup>
                <col />
                {showUploader && <col className="w-[13%]" />}
                <col className="w-[8%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[8%]" />
                <col className="w-[11%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr>
                  <th>Session</th>
                  {showUploader && <th>User</th>}
                  <th className="text-right">Total</th>
                  <th className="text-right">Already in DNC</th>
                  <th className="text-right">DNC from BLA</th>
                  <th className="text-right">Clean</th>
                  <th className="text-center">Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((s) => {
                  const isProcessing = s.status === 'PROCESSING' || s.status === 'QUEUED';
                  return (
                    <tr key={s.id}>
                      <td>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-surface-raised text-zinc-400">
                            <FileSpreadsheet className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => onSelectSession(s.id)}
                              className="block w-full truncate text-left font-medium text-white transition hover:text-emerald-300"
                              title={s.session_name || s.original_filename}
                            >
                              {s.session_name || s.original_filename}
                            </button>
                            <span className="block truncate text-[11px] text-zinc-500" title={s.original_filename}>
                              <span className="font-mono">{s.original_filename}</span> · {formatDateTime(s.created_at)}
                            </span>
                          </div>
                        </div>
                      </td>
                      {showUploader && (
                        <td className="truncate text-zinc-400" title={s.user_name || s.user_email || ''}>
                          {s.user_name || s.user_email || '—'}
                        </td>
                      )}
                      <td className="text-right font-mono font-semibold text-white">{formatNumber(s.total_rows)}</td>
                      <td className="text-right">
                        {s.local_dnc_count > 0 ? <span className="chip-amber">{formatNumber(s.local_dnc_count)}</span> : <span className="font-mono text-zinc-600">0</span>}
                      </td>
                      <td className="text-right">
                        {s.bla_dnc_count > 0 ? <span className="chip-red">{formatNumber(s.bla_dnc_count)}</span> : <span className="font-mono text-zinc-600">0</span>}
                      </td>
                      <td className="text-right">
                        <span className="chip-emerald">{formatNumber(s.clean_count)}</span>
                      </td>
                      <td className="text-center">
                        <StatusBadge status={s.status} size="xs" />
                        {isProcessing && (
                          <span className="mt-1 block font-mono text-[10px] text-zinc-500">{Number(s.progress_percent || 0).toFixed(0)}%</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1.5">
                          {s.status === 'COMPLETED' && s.clean_count > 0 && (
                            <a href={sessionApi.getCleanExportUrl(s.id, 'csv')} download className="btn-icon" title="Download clean CSV" aria-label="Download clean CSV">
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button onClick={() => onSelectSession(s.id)} className="btn-icon" title="View details" aria-label="View details">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setSessionToDelete(s)}
                            className="btn-icon hover:!border-red-900/60 hover:!text-red-400"
                            title="Delete session"
                            aria-label="Delete session"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-surface-border px-4 py-3 text-xs text-zinc-400">
            <span>
              Showing <span className="font-mono text-zinc-200">{(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-mono text-zinc-200">{formatNumber(pagination.total)}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(p - 1, 1))} className="btn-icon" aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-mono text-zinc-200">
                {page} / {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                className="btn-icon"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      <Modal isOpen={!!sessionToDelete} onClose={() => setSessionToDelete(null)} title="Delete session" size="sm">
        {sessionToDelete && (
          <div className="space-y-4">
            <div className="alert-error">
              <AlertTriangle className="mt-px h-4 w-4 shrink-0 text-red-400" />
              <span>
                Delete <strong className="text-white">{sessionToDelete.session_name || sessionToDelete.original_filename}</strong>? This removes the
                session and all of its records permanently.
              </span>
            </div>
            {deleteError && <p className="text-xs text-red-300">{deleteError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setSessionToDelete(null)} disabled={deleting} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleDeleteSession} disabled={deleting} className="btn-danger">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default SessionsView;
