import React, { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  FileText,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export function AuditLogsViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-950 border border-zinc-800">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Audit Logs</h2>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            System activity history tracking logins, file checks, and DNC updates.
          </p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Events' },
            { id: 'LEAD_SCRUB_COMPLETED', label: 'File Checks' },
            { id: 'MASTER_DNC_UPLOADED', label: 'DNC Uploads' },
            { id: 'USER_LOGIN', label: 'Logins' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleActionChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                actionFilter === tab.id
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-white"
          />
        </form>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Loading audit logs..." />
        ) : logs.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="text-[11px] uppercase tracking-wider text-zinc-400 bg-zinc-900/60 border-b border-zinc-800">
                  <tr>
                    <th className="py-3 pl-4">Timestamp</th>
                    <th className="py-3">User</th>
                    <th className="py-3">Action</th>
                    <th className="py-3">Target</th>
                    <th className="py-3 pr-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-900/40 transition">
                      <td className="py-3 pl-4 text-zinc-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 font-sans text-white font-medium">
                        {log.user_email || 'System'}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-zinc-900 text-zinc-300 border-zinc-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-500">
                        {log.resource_type ? `${log.resource_type}: ${log.resource_id || ''}` : '—'}
                      </td>
                      <td className="py-3 pr-4 text-right font-sans">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition text-xs cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
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
                events
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
            <FileText className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
            <p className="text-sm">No audit logs found.</p>
          </div>
        )}
      </div>

      {/* INSPECT MODAL */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={`Event Details: ${selectedLog?.action}`}
      >
        {selectedLog && (
          <div className="space-y-4 font-sans text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <div>
                <span className="text-zinc-500 block">Time</span>
                <span className="font-mono text-white">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">User</span>
                <span className="text-white">{selectedLog.user_email || 'System'}</span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Data Payload
              </span>
              <pre className="p-4 rounded-xl bg-black border border-zinc-800 text-zinc-300 font-mono text-[11px] overflow-x-auto max-h-60">
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
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold"
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
