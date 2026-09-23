import React, { useEffect, useState, useRef } from 'react';
import { dncApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import StatusBadge from '../common/StatusBadge';
import {
  Database,
  UploadCloud,
  PlusCircle,
  Download,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export function MasterDncManager() {
  const { isAdmin } = useAuth();

  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);

  // Upload Form State
  const [uploadFile, setUploadFile] = useState(null);
  const [campaignName, setCampaignName] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // Single Add Form State
  const [singlePhone, setSinglePhone] = useState('');
  const [singleCampaign, setSingleCampaign] = useState('');
  const [singleNotes, setSingleNotes] = useState('');
  const [singleSubmitting, setSingleSubmitting] = useState(false);
  const [singleError, setSingleError] = useState(null);

  const fetchStats = async () => {
    try {
      const res = await dncApi.getStats();
      setStats(res.data);
    } catch (err) {
      console.error('[DNC] Fetch stats error:', err);
    }
  };

  const fetchRecords = async (targetPage = page, targetSource = sourceFilter, targetSearch = search) => {
    try {
      setTableLoading(true);
      const res = await dncApi.list({
        page: targetPage,
        limit: 50,
        source: targetSource,
        search: targetSearch,
      });
      setRecords(res.data.data || []);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('[DNC] Fetch records error:', err);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      await fetchStats();
      await fetchRecords(1, 'ALL', '');
      setLoading(false);
    }
    init();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRecords(1, sourceFilter, search);
  };

  const handleSourceChange = (newSource) => {
    setSourceFilter(newSource);
    setPage(1);
    fetchRecords(1, newSource, search);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchRecords(newPage, sourceFilter, search);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    try {
      setUploading(true);
      setUploadError(null);
      setUploadResult(null);

      const formData = new FormData();
      formData.append('file', uploadFile);
      if (campaignName) formData.append('campaignName', campaignName);
      if (uploadNotes) formData.append('notes', uploadNotes);

      const res = await dncApi.upload(formData);
      setUploadResult(res.data.stats);
      await fetchStats();
      await fetchRecords(1, sourceFilter, search);
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Failed to process DNC file upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (!singlePhone) return;

    try {
      setSingleSubmitting(true);
      setSingleError(null);

      await dncApi.addSingle({
        phone: singlePhone,
        campaign: singleCampaign,
        notes: singleNotes,
      });

      setIsSingleModalOpen(false);
      setSinglePhone('');
      setSingleCampaign('');
      setSingleNotes('');
      await fetchStats();
      await fetchRecords(1, sourceFilter, search);
    } catch (err) {
      setSingleError(err.response?.data?.message || 'Failed to add phone to DNC.');
    } finally {
      setSingleSubmitting(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!window.confirm('Delete this record from Master DNC?')) return;
    try {
      await dncApi.delete(id);
      await fetchStats();
      await fetchRecords(page, sourceFilter, search);
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return <LoadingSpinner message="Accessing Master DNC Repository..." size="lg" />;

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl glass-panel border border-slate-800 bg-gradient-to-r from-slate-900/90 to-brand-950/20">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Master DNC Repository
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Internal centralized registry of Do Not Call phone numbers. Verified against all uploaded leads to eliminate external API expenses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={dncApi.getExportUrl(sourceFilter)}
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export DNC</span>
          </a>

          <button
            onClick={() => setIsSingleModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Single</span>
          </button>

          <button
            onClick={() => {
              setUploadFile(null);
              setUploadResult(null);
              setUploadError(null);
              setIsUploadModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/25 transition cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Bulk Upload DNC</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl glass-panel border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Total Indexed DNCs</span>
          <span className="text-2xl font-bold text-white font-mono">
            {stats?.total?.toLocaleString() || 0}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Ready for indexed search</span>
        </div>

        <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
          <span className="text-xs text-purple-400 font-semibold block mb-1">BLA Auto-Synced</span>
          <span className="text-2xl font-bold text-purple-400 font-mono">
            {(stats?.bySource?.find((s) => s.source === 'BLA_SYNC')?.count || 0).toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">From previous lead checks</span>
        </div>

        <div className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/20">
          <span className="text-xs text-brand-400 font-semibold block mb-1">Manual / Batch Uploads</span>
          <span className="text-2xl font-bold text-brand-400 font-mono">
            {(
              (stats?.bySource?.find((s) => s.source === 'MANUAL_UPLOAD')?.count || 0) +
              (stats?.bySource?.find((s) => s.source === 'INITIAL_SEED')?.count || 0)
            ).toLocaleString()}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Internal compliance lists</span>
        </div>

        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <span className="text-xs text-emerald-400 font-semibold block mb-1">Added Last 24h</span>
          <span className="text-2xl font-bold text-emerald-400 font-mono">
            {stats?.addedLast24h?.toLocaleString() || 0}
          </span>
          <span className="text-[11px] text-slate-400 block mt-1">Live synchronizations</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Source Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Sources' },
            { id: 'MANUAL_UPLOAD', label: 'Bulk Uploads' },
            { id: 'BLA_SYNC', label: 'BLA Synced' },
            { id: 'INITIAL_SEED', label: 'National Registry' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSourceChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                sourceFilter === tab.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search phone number..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </form>
      </div>

      {/* DNC Records Table */}
      <div className="rounded-2xl glass-panel border border-slate-800 overflow-hidden">
        {tableLoading ? (
          <LoadingSpinner message="Searching Master DNC database..." />
        ) : records.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/80 border-b border-slate-800">
                  <tr>
                    <th className="py-3 pl-4">Raw Phone</th>
                    <th className="py-3">Normalized Phone</th>
                    <th className="py-3">Source Channel</th>
                    <th className="py-3">Campaign / File</th>
                    <th className="py-3">Notes</th>
                    <th className="py-3">Date Added</th>
                    {isAdmin && <th className="py-3 pr-4 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-900/50 transition">
                      <td className="py-3 pl-4 text-slate-300 font-medium">{rec.phone_number}</td>
                      <td className="py-3 text-slate-200 font-semibold">{rec.normalized_phone}</td>
                      <td className="py-3 font-sans">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            rec.source === 'BLA_SYNC'
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                              : rec.source === 'INITIAL_SEED'
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                              : 'bg-brand-500/10 text-brand-300 border-brand-500/20'
                          }`}
                        >
                          {rec.source}
                        </span>
                      </td>
                      <td className="py-3 font-sans text-slate-400 text-xs truncate max-w-[150px]">
                        {rec.campaign_or_file || '—'}
                      </td>
                      <td className="py-3 font-sans text-slate-400 text-xs truncate max-w-[200px]">
                        {rec.notes || '—'}
                      </td>
                      <td className="py-3 text-slate-400 text-[11px]">
                        {new Date(rec.created_at).toLocaleDateString()}
                      </td>
                      {isAdmin && (
                        <td className="py-3 pr-4 text-right font-sans">
                          <button
                            onClick={() => handleDeleteRecord(rec.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Delete DNC Number"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
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
            <Database className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-300">No DNC records found.</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your search term or upload a new DNC list.</p>
          </div>
        )}
      </div>

      {/* MODAL: BULK UPLOAD DNC */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Bulk Ingest Master DNC File"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-brand-500/60 bg-slate-900/40 rounded-xl p-6 text-center cursor-pointer transition"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && setUploadFile(e.target.files[0])}
              accept=".csv,.xlsx,.xls,.txt"
              className="hidden"
            />
            <UploadCloud className="w-8 h-8 text-brand-400 mx-auto mb-2" />
            {uploadFile ? (
              <div>
                <span className="text-xs font-semibold text-emerald-400 block">{uploadFile.name}</span>
                <span className="text-[11px] text-slate-400">
                  {(uploadFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ) : (
              <div>
                <span className="text-xs font-medium text-slate-200 block">
                  Click or drag CSV, XLSX, or TXT file here
                </span>
                <span className="text-[11px] text-slate-400">Numbers will be deduplicated and normalized</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Campaign / List Identifier
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g. FTC_National_DNC_Update_2026"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Notes / Audit Context
            </label>
            <input
              type="text"
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              placeholder="e.g. Direct opt-out list supplied by legal department"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {uploadError}
            </div>
          )}

          {uploadResult && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs space-y-1">
              <span className="font-semibold block">Upload Complete!</span>
              <div>Added New: {uploadResult.addedNew.toLocaleString()}</div>
              <div>Already in DB / Duplicates: {uploadResult.duplicatesOrExisting.toLocaleString()}</div>
              <div>Invalid Numbers: {uploadResult.invalidCount.toLocaleString()}</div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={!uploadFile || uploading}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-brand-500/20"
            >
              {uploading ? 'Processing File...' : 'Ingest DNC Records'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD SINGLE DNC */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => setIsSingleModalOpen(false)}
        title="Add Single DNC Phone Number"
      >
        <form onSubmit={handleSingleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Phone Number *
            </label>
            <input
              type="text"
              value={singlePhone}
              onChange={(e) => setSinglePhone(e.target.value)}
              placeholder="e.g. (555) 123-4567 or 5551234567"
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Campaign / Source
            </label>
            <input
              type="text"
              value={singleCampaign}
              onChange={(e) => setSingleCampaign(e.target.value)}
              placeholder="e.g. Direct Consumer Request"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Notes
            </label>
            <input
              type="text"
              value={singleNotes}
              onChange={(e) => setSingleNotes(e.target.value)}
              placeholder="e.g. Inbound call opt-out on 09/23"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
            />
          </div>

          {singleError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {singleError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSingleModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={singleSubmitting}
              className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-brand-500/20"
            >
              {singleSubmitting ? 'Saving...' : 'Add to DNC Database'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default MasterDncManager;
