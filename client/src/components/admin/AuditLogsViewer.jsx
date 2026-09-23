import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  History,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileCode,
} from 'lucide-react';

export function AuditLogsViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

  // Details Modal
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async (targetPage = page, targetAction = actionFilter, targetSearch = search) => {
    try {
      setLoading(true);
      const res = await adminApi.getAuditLogs({
        page: targetPage,
        limit: 50,
        action: targetAction,
        search: targetSearch,
      });
      setLogs(res.data.data || []);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('[AUDIT] Fetch logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1, 'ALL', '');
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1, actionFilter, search);
  };

  const handleActionChange = (newAction) => {
    setActionFilter(newAction);
    setPage(1);
    fetchLogs(1, newAction, search);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchLogs(newPage, actionFilter, search);
  };

  const getActionColor = (action) => {
    if (action.includes('LOGIN')) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    if (action.includes('SCRUB')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (action.includes('DNC')) return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    if (action.includes('DELETE')) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (action.includes('CONFIG')) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-slate-300 bg-slate-800 border-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border border-slate-800 bg-gradient-to-r from-slate-900/90 to-brand-950/20">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            System Audit Trail
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Immutable log of all user activities, DNC uploads, scrubbing jobs, and configuration updates for regulatory compliance.
          </p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Events' },
            { id: 'LEAD_SCRUB_COMPLETED', label: 'Scrub Jobs' },
            { id: 'MASTER_DNC_UPLOADED', label: 'DNC Ingest' },
            { id: 'USER_LOGIN', label: 'Logins' },
            { id: 'API_CONFIG_UPDATED', label: 'Config Changes' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleActionChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                actionFilter === tab.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, action, details..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </form>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl glass-panel border border-slate-800 overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Loading audit trail records..." />
        ) : logs.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/80 border-b border-slate-800">
                  <tr>
                    <th className="py-3 pl-4">Timestamp</th>
                    <th className="py-3">User / Actor</th>
                    <th className="py-3">Action</th>
                    <th className="py-3">Target Resource</th>
                    <th className="py-3">IP Address</th>
                    <th className="py-3 pr-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/50 transition">
                      <td className="py-3 pl-4 text-slate-300">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 font-sans text-slate-200 font-medium">
                        {log.user_email || 'System Daemon'}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getActionColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">
                        {log.resource_type ? `${log.resource_type}: ${log.resource_id || ''}` : '—'}
                      </td>
                      <td className="py-3 text-slate-400">{log.ip_address || '127.0.0.1'}</td>
                      <td className="py-3 pr-4 text-right font-sans">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition text-xs"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-400 font-sans">
              <span>
                Showing {(page - 1) * pagination.limit + 1} to{' '}
                {Math.min(page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()}{' '}
                records
              </span>

              <div className="flex items-center gap-2 font-mono">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-slate-200">
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
            <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-300">No audit log records found.</p>
          </div>
        )}
      </div>

      {/* MODAL: INSPECT AUDIT DETAILS */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={`Audit Event: ${selectedLog?.action}`}
      >
        {selectedLog && (
          <div className="space-y-4 font-sans text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <span className="text-slate-400 block">Timestamp</span>
                <span className="font-mono text-slate-200">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Actor</span>
                <span className="text-slate-200">{selectedLog.user_email || 'System'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Resource</span>
                <span className="font-mono text-slate-200">
                  {selectedLog.resource_type}: {selectedLog.resource_id}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">IP Address</span>
                <span className="font-mono text-slate-200">{selectedLog.ip_address || '127.0.0.1'}</span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                JSON Event Payload
              </span>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-60">
                {JSON.stringify(
                  typeof selectedLog.details === 'string'
                    ? JSON.parse(selectedLog.details)
                    : selectedLog.details || {},
                  null,
                  2
                )}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default AuditLogsViewer;
