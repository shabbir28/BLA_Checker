import React, { useEffect, useState, useRef } from 'react';
import { dncApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  UploadCloud,
  Plus,
  Download,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Database,
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState('idle'); // 'idle' | 'uploading' | 'processing' | 'completed'
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
      setUploadProgress(0);
      setUploadPhase('uploading');
      setUploadError(null);
      setUploadResult(null);

      const formData = new FormData();
      formData.append('file', uploadFile);
      if (campaignName) formData.append('campaignName', campaignName);
      if (uploadNotes) formData.append('notes', uploadNotes);

      const res = await dncApi.upload(formData, (percent) => {
        setUploadProgress(percent);
        if (percent >= 100) {
          setUploadPhase('processing');
        }
      });

      setUploadPhase('completed');
      setUploadResult(res.data.stats);
      await fetchStats();
      await fetchRecords(1, sourceFilter, search);
    } catch (err) {
      setUploadPhase('idle');
      setUploadError(err.response?.data?.message || 'Failed to upload DNC file.');
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
      setSingleError(err.response?.data?.message || 'Failed to add phone number.');
    } finally {
      setSingleSubmitting(false);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!window.confirm('Delete this phone number from DNC list?')) return;
    try {
      await dncApi.delete(id);
      await fetchStats();
      await fetchRecords(page, sourceFilter, search);
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const refreshAll = async () => {
    await fetchStats();
    await fetchRecords(page, sourceFilter, search);
  };

  if (loading) return <LoadingSpinner message="Loading DNC Upload..." size="lg" />;

  const totalCount = stats?.total || 0;
  const blaSyncCount = stats?.bySource?.find((s) => s.source === 'BLA_SYNC')?.count || 0;
  const uploadedCount =
    (stats?.bySource?.find((s) => s.source === 'MANUAL_UPLOAD')?.count || 0) +
    (stats?.bySource?.find((s) => s.source === 'INITIAL_SEED')?.count || 0);
  const last24h = stats?.addedLast24h || 0;

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">DNC Upload</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage your Do Not Call list. Numbers here are filtered for free before calling BLA API.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshAll}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 transition"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <a
            href={dncApi.getExportUrl(sourceFilter)}
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </a>

          <button
            onClick={() => setIsSingleModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Number</span>
          </button>

          <button
            onClick={() => {
              setUploadFile(null);
              setUploadResult(null);
              setUploadError(null);
              setCampaignName('');
              setUploadNotes('');
              setIsUploadModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload DNC</span>
          </button>
        </div>
      </div>

      {/* Compact Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800">
          <span className="text-[11px] text-zinc-500 block">Total DNC</span>
          <span className="text-lg font-bold text-white font-mono">{totalCount.toLocaleString()}</span>
        </div>
        <div className="px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800">
          <span className="text-[11px] text-zinc-500 block">BLA Synced</span>
          <span className="text-lg font-bold text-emerald-400 font-mono">{Number(blaSyncCount).toLocaleString()}</span>
        </div>
        <div className="px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800">
          <span className="text-[11px] text-zinc-500 block">Uploaded</span>
          <span className="text-lg font-bold text-white font-mono">{Number(uploadedCount).toLocaleString()}</span>
        </div>
        <div className="px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800">
          <span className="text-[11px] text-zinc-500 block">Last 24h</span>
          <span className="text-lg font-bold text-white font-mono">{last24h.toLocaleString()}</span>
        </div>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-950 border border-zinc-800 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'MANUAL_UPLOAD', label: 'Uploaded' },
            { id: 'BLA_SYNC', label: 'BLA Synced' },
            { id: 'INITIAL_SEED', label: 'Seeded' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSourceChange(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                sourceFilter === tab.id
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search phone number..."
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-zinc-600 font-mono"
          />
        </form>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
        {tableLoading ? (
          <LoadingSpinner message="Searching..." />
        ) : records.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-zinc-500 bg-zinc-900/50 border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 pl-4">Phone</th>
                    <th className="py-2.5">Normalized</th>
                    <th className="py-2.5">Source</th>
                    <th className="py-2.5">File / Campaign</th>
                    <th className="py-2.5">Date</th>
                    {isAdmin && <th className="py-2.5 pr-4 text-right"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-zinc-900/30 transition">
                      <td className="py-2.5 pl-4 text-zinc-400 text-[11px]">{rec.phone_number}</td>
                      <td className="py-2.5 text-white font-medium text-[11px]">{rec.normalized_phone}</td>
                      <td className="py-2.5 font-sans">
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            rec.source === 'BLA_SYNC'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                              : rec.source === 'MANUAL_UPLOAD'
                              ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                              : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                          }`}
                        >
                          {rec.source === 'BLA_SYNC' ? 'BLA' : rec.source === 'MANUAL_UPLOAD' ? 'Upload' : rec.source}
                        </span>
                      </td>
                      <td className="py-2.5 font-sans text-zinc-500 text-[11px] truncate max-w-[140px]">
                        {rec.campaign_or_file || '—'}
                      </td>
                      <td className="py-2.5 text-zinc-600 text-[10px]">
                        {new Date(rec.created_at).toLocaleDateString()}
                      </td>
                      {isAdmin && (
                        <td className="py-2.5 pr-4 text-right font-sans">
                          <button
                            onClick={() => handleDeleteRecord(rec.id)}
                            className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-zinc-900 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800 text-[11px] text-zinc-500 font-sans">
              <span>
                {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of{' '}
                {pagination.total.toLocaleString()}
              </span>
              <div className="flex items-center gap-1.5 font-mono">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-800 transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-zinc-400 px-1">
                  {page}/{pagination.totalPages || 1}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= pagination.totalPages}
                  className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-800 transition"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-zinc-600">
            <Database className="w-6 h-6 mx-auto mb-2 text-zinc-700" />
            <p className="text-xs">No DNC numbers found.</p>
            <p className="text-[10px] text-zinc-700 mt-1">Upload a DNC file or add numbers individually.</p>
          </div>
        )}
      </div>

      {/* MODAL: BULK DNC UPLOAD */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload DNC File"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-900/30 rounded-xl p-5 text-center cursor-pointer transition"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && setUploadFile(e.target.files[0])}
              accept=".csv,.xlsx,.xls,.txt"
              className="hidden"
            />
            <UploadCloud className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
            {uploadFile ? (
              <div>
                <span className="text-xs font-semibold text-white block">{uploadFile.name}</span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {(uploadFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ) : (
              <div>
                <span className="text-xs text-zinc-300 block">
                  Click to select CSV, Excel, or TXT file
                </span>
                <span className="text-[10px] text-zinc-600">
                  Numbers will be deduplicated automatically
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">List Name</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g. National_DNC_Update"
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              placeholder="e.g. Added by compliance team"
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-zinc-600"
            />
          </div>

          {/* Real-time Progress Bar & Status */}
          {uploading && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {uploadPhase === 'processing'
                    ? 'Importing & deduplicating into Master DNC...'
                    : `Uploading file... ${uploadProgress}%`}
                </span>
                <span className="text-emerald-400 font-bold font-mono">
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-200"
                  style={{ width: `${Math.max(5, uploadProgress)}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                {uploadPhase === 'processing'
                  ? 'Fast-indexing phone numbers and removing duplicates...'
                  : 'Transferring file to server...'}
              </p>
            </div>
          )}

          {uploadError && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/40 text-red-300 text-xs">
              {uploadError}
            </div>
          )}

          {uploadResult && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-900/40 text-emerald-300 text-xs space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-emerald-900/40">
                <span className="font-bold text-white text-xs">Upload & Ingestion Complete!</span>
                <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 font-mono text-[10px]">
                  100% Processed
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-zinc-950/60 border border-emerald-900/30">
                  <span className="text-zinc-400 block text-[10px]">New DNC Added</span>
                  <span className="text-emerald-400 font-bold font-mono text-sm">
                    {uploadResult.addedNew.toLocaleString()}
                  </span>
                </div>
                <div className="p-2 rounded bg-zinc-950/60 border border-emerald-900/30">
                  <span className="text-zinc-400 block text-[10px]">Duplicates / Existing</span>
                  <span className="text-zinc-300 font-bold font-mono text-sm">
                    {uploadResult.duplicatesOrExisting.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-zinc-400 flex justify-between pt-1">
                <span>Total rows evaluated:</span>
                <span className="text-white font-mono">{uploadResult.totalRows.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsUploadModalOpen(false);
                setUploadProgress(0);
                setUploadPhase('idle');
                setUploadError(null);
                setUploadResult(null);
              }}
              className="px-4 py-2 rounded-lg bg-zinc-900 text-zinc-400 text-xs font-medium hover:bg-zinc-800 transition cursor-pointer"
            >
              {uploadResult ? 'Done' : 'Close'}
            </button>
            <button
              type="submit"
              disabled={!uploadFile || uploading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-bold disabled:opacity-40 transition cursor-pointer"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{uploadProgress < 100 ? `Uploading (${uploadProgress}%)` : 'Importing...'}</span>
                </>
              ) : (
                'Upload & Import'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD SINGLE NUMBER */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => setIsSingleModalOpen(false)}
        title="Add DNC Number"
      >
        <form onSubmit={handleSingleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Phone Number *</label>
            <input
              type="text"
              value={singlePhone}
              onChange={(e) => setSinglePhone(e.target.value)}
              placeholder="e.g. 555-123-4567"
              required
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-zinc-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Source / Reason</label>
            <input
              type="text"
              value={singleCampaign}
              onChange={(e) => setSingleCampaign(e.target.value)}
              placeholder="e.g. Customer Opt-Out"
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={singleNotes}
              onChange={(e) => setSingleNotes(e.target.value)}
              placeholder="e.g. Call center request"
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-zinc-600"
            />
          </div>

          {singleError && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/40 text-red-300 text-xs">
              {singleError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsSingleModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-zinc-900 text-zinc-400 text-xs font-medium hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={singleSubmitting}
              className="px-5 py-2 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-bold disabled:opacity-40 transition"
            >
              {singleSubmitting ? 'Saving...' : 'Add Number'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default MasterDncManager;
