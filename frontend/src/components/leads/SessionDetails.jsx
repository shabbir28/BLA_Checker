import React, { useEffect, useState, useCallback } from 'react';
import { sessionApi } from '../../services/api';
import StatusBadge from '../common/StatusBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import { formatNumber, formatDateTime, safeRate } from '../../utils/format';
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Phone,
  Loader2,
} from 'lucide-react';

const PAGE_SIZE = 50;

export function SessionDetails({ sessionId, onBack }) {
  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [deleting, setDeleting] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const res = await sessionApi.get(sessionId);
      setSession(res.data.session);
    } catch (err) {
      console.error('[SESSION DETAILS] Fetch session error:', err);
    }
  }, [sessionId]);

  // Callers always pass explicit filter args, so this only needs to change when the
  // session changes. Depending on page/status/search here would re-run the mount effect
  // below on every filter click and reset the table back to page 1 / ALL.
  const fetchRecords = useCallback(
    async (targetPage, targetStatus, targetSearch) => {
      try {
        setRecordsLoading(true);
        const res = await sessionApi.getRecords(sessionId, {
          page: targetPage,
          limit: PAGE_SIZE,
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
    },
    [sessionId]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setStatusFilter('ALL');
      setSearchTerm('');
      setPage(1);
      await fetchSession();
      await fetchRecords(1, 'ALL', '');
      if (!cancelled) setLoading(false);
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [fetchSession, fetchRecords]);

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

  if (loading) return <LoadingSpinner message="Loading records…" size="lg" />;

  if (!session) {
    return (
      <div className="card">
        <EmptyState title="Session not found" description="It may have been deleted." actionLabel="Go back" onAction={onBack} />
      </div>
    );
  }

  const cleanRate = safeRate(session.clean_count, session.total_rows);

  const filterTabs = [
    { id: 'ALL', label: 'All', count: session.total_rows },
    { id: 'CLEAN', label: 'Clean', count: session.clean_count, tone: 'text-emerald-300' },
    { id: 'LOCAL_DNC', label: 'Already in DNC', count: session.local_dnc_count, tone: 'text-amber-300' },
    { id: 'BLA_DNC', label: 'DNC from BLA', count: session.bla_dnc_count, tone: 'text-red-300' },
    { id: 'INVALID', label: 'Invalid', count: session.invalid_numbers },
    { id: 'DUPLICATE', label: 'Duplicates', count: session.duplicate_numbers },
  ];

  const summary = [
    { label: 'Total in file', value: session.total_rows, cls: 'text-white' },
    { label: 'Already in DNC', value: session.local_dnc_count, cls: 'text-amber-300' },
    { label: 'DNC from BLA', value: session.bla_dnc_count, cls: 'text-red-300' },
    { label: 'Clean numbers', value: session.clean_count, cls: 'text-emerald-300', hint: `${cleanRate.toFixed(1)}% of file` },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button onClick={onBack} className="btn-ghost -ml-3 w-fit">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {session.clean_count > 0 && (
            <>
              <a href={sessionApi.getCleanExportUrl(sessionId, 'csv')} download className="btn-success btn-sm">
                <Download className="h-3.5 w-3.5" /> Clean (CSV)
              </a>
              <a href={sessionApi.getCleanExportUrl(sessionId, 'xlsx')} download className="btn-secondary btn-sm">
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Clean (Excel)
              </a>
            </>
          )}
          <a href={sessionApi.getFullExportUrl(sessionId, 'csv')} download className="btn-secondary btn-sm">
            <Download className="h-3.5 w-3.5" /> Full report
          </a>
          <button
            onClick={handleDeleteSession}
            disabled={deleting}
            className="btn-icon hover:!border-red-900/60 hover:!text-red-400"
            title="Delete session"
            aria-label="Delete session"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-col gap-3 border-b border-surface-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="truncate text-xl font-bold tracking-tight text-white">{session.session_name}</h2>
              <StatusBadge status={session.status} size="xs" />
            </div>
            <p className="mt-1 font-mono text-xs text-zinc-500">
              {session.original_filename} · {formatDateTime(session.created_at)}
              {session.user_name ? ` · ${session.user_name}` : ''}
            </p>
          </div>
          <div className="w-full sm:w-56">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Clean rate</span>
              <span className="font-mono text-zinc-200">{cleanRate.toFixed(1)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-raised">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, cleanRate)}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {summary.map((s) => (
            <div key={s.label} className="card-raised p-3.5">
              <span className="block text-[11px] text-zinc-500">{s.label}</span>
              <span className={`mt-1 block font-mono text-xl font-bold leading-none ${s.cls}`}>{formatNumber(s.value)}</span>
              {s.hint && <span className="mt-1 block text-[11px] text-zinc-600">{s.hint}</span>}
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-surface-border bg-surface-card p-1">
          {filterTabs.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleFilterChange(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  active ? 'bg-surface-raised text-white ring-1 ring-surface-border-strong' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count !== null && (
                  <span className={`font-mono text-[11px] ${active ? tab.tone || 'text-zinc-200' : 'text-zinc-500'}`}>{formatNumber(tab.count)}</span>
                )}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search phone number… (Enter)"
            className="input input-with-icon py-2 font-mono"
          />
        </form>
      </div>

      <section className="card overflow-hidden">
        {recordsLoading ? (
          <LoadingSpinner message="Loading numbers…" />
        ) : records.length === 0 ? (
          <EmptyState icon={Phone} title="No numbers found" description="Try a different filter or search term." compact />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Raw number</th>
                    <th>Normalized</th>
                    <th>Status</th>
                    <th>Result note</th>
                    <th className="text-right">Checked at</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => (
                    <tr key={rec.id}>
                      <td className="font-mono text-zinc-300">{rec.raw_phone}</td>
                      <td className="font-mono font-semibold text-white">{rec.normalized_phone || '—'}</td>
                      <td>
                        <StatusBadge status={rec.status} size="xs" />
                      </td>
                      <td className="max-w-md truncate text-xs text-zinc-400">{rec.reason || 'Verified'}</td>
                      <td className="whitespace-nowrap text-right text-xs text-zinc-500">
                        {new Date(rec.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-surface-border px-4 py-3 text-xs text-zinc-400">
              <span>
                Showing <span className="font-mono text-zinc-200">{(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)}</span> of{' '}
                <span className="font-mono text-zinc-200">{formatNumber(pagination.total)}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1} className="btn-icon" aria-label="Previous page">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 font-mono text-zinc-200">
                  {page} / {pagination.totalPages || 1}
                </span>
                <button onClick={() => handlePageChange(page + 1)} disabled={page >= pagination.totalPages} className="btn-icon" aria-label="Next page">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default SessionDetails;
