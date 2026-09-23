import React, { useEffect, useState, useRef } from 'react';
import { dncApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  Database,
  UploadCloud,
  Plus,
  Download,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
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

  if (loading) return <LoadingSpinner message="Loading DNC Upload..." size="lg" />;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-950 border border-zinc-800">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">DNC Upload</h2>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Upload and manage your Do Not Call lists. Blocked numbers here are filtered out for free before calling any paid API.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href={dncApi.getExportUrl(sourceFilter)}
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download DNC List</span>
          </a>

          <button
            onClick={() => setIsSingleModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-800 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Single</span>
          </button>

          <button
            onClick={() => {
              setUploadFile(null);
              setUploadResult(null);
              setUploadError(null);
              setIsUploadModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition shadow-md shadow-white/5 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-black" />
            <span>DNC Upload</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">Total DNC Numbers</span>
          <span className="text-2xl font-bold text-white font-mono">
            {stats?.total?.toLocaleString() || 0}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-1">Ready for fast matching</span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">Auto-Synced from BLA</span>
          <span className="text-2xl font-bold text-emerald-400 font-mono">
            {(stats?.bySource?.find((s) => s.source === 'BLA_SYNC')?.count || 0).toLocaleString()}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-1">Saved from past file checks</span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">Uploaded Numbers</span>
          <span className="text-2xl font-bold text-white font-mono">
            {(
              (stats?.bySource?.find((s) => s.source === 'MANUAL_UPLOAD')?.count || 0) +
              (stats?.bySource?.find((s) => s.source === 'INITIAL_SEED')?.count || 0)
            ).toLocaleString()}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-1">Bulk and seeded DNC lists</span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
          <span className="text-xs text-zinc-400 block mb-1">Added Last 24 Hours</span>
          <span className="text-2xl font-bold text-white font-mono">
            {stats?.addedLast24h?.toLocaleString() || 0}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-1">New additions</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Numbers' },
            { id: 'MANUAL_UPLOAD', label: 'DNC Uploads' },
            { id: 'BLA_SYNC', label: 'BLA Auto-Synced' },
            { id: 'INITIAL_SEED', label: 'Seeded List' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSourceChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                sourceFilter === tab.id
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
            placeholder="Search phone number..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
          />
        </form>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden">
        {tableLoading ? (
          <LoadingSpinner message="Searching DNC numbers..." />
        ) : records.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="text-[11px] uppercase tracking-wider text-zinc-400 bg-zinc-900/60 border-b border-zinc-800">
                  <tr>
                    <th className="py-3 pl-4">Phone Number</th>
                    <th className="py-3">Standard 10-Digit</th>
                    <th className="py-3">Source</th>
                    <th className="py-3">File / Campaign</th>
                    <th className="py-3">Notes</th>
                    <th className="py-3">Date Added</th>
                    {isAdmin && <th className="py-3 pr-4 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-zinc-900/40 transition">
                      <td className="py-3 pl-4 text-zinc-300 font-medium">{rec.phone_number}</td>
                      <td className="py-3 text-white font-semibold">{rec.normalized_phone}</td>
                      <td className="py-3 font-sans">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-zinc-900 text-zinc-300 border-zinc-800">
                          {rec.source === 'BLA_SYNC' ? 'BLA Synced' : rec.source}
                        </span>
                      </td>
                      <td className="py-3 font-sans text-zinc-400 text-xs truncate max-w-[150px]">
                        {rec.campaign_or_file || '—'}
                      </td>
                      <td className="py-3 font-sans text-zinc-400 text-xs truncate max-w-[200px]">
                        {rec.notes || '—'}
                      </td>
                      <td className="py-3 text-zinc-500 text-[11px]">
                        {new Date(rec.created_at).toLocaleDateString()}
                      </td>
                      {isAdmin && (
                        <td className="py-3 pr-4 text-right font-sans">
                          <button
                            onClick={() => handleDeleteRecord(rec.id)}
                            className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition"
                            title="Delete Number"
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
            <Database className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
            <p className="text-sm">No DNC numbers found.</p>
          </div>
        )}
      </div>

      {/* MODAL: BULK DNC UPLOAD */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="DNC Upload (Bulk File)"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-800 hover:border-zinc-600 bg-zinc-900/40 rounded-xl p-6 text-center cursor-pointer transition"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && setUploadFile(e.target.files[0])}
              accept=".csv,.xlsx,.xls,.txt"
              className="hidden"
            />
            <UploadCloud className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            {uploadFile ? (
              <div>
                <span className="text-xs font-bold text-white block">{uploadFile.name}</span>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {(uploadFile.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ) : (
              <div>
                <span className="text-xs font-semibold text-white block">
                  Click to select CSV, Excel (.xlsx), or TXT file
                </span>
                <span className="text-[11px] text-zinc-500">
                  Numbers will be deduplicated and saved to Master DNC
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              List Name / Identifier
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g. National_DNC_Update"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              placeholder="e.g. Added by compliance team"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-white"
            />
          </div>

          {uploadError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
              {uploadError}
            </div>
          )}

          {uploadResult && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs space-y-1">
              <span className="font-bold block">Upload Success!</span>
              <div>Added: {uploadResult.addedNew.toLocaleString()} new numbers</div>
              <div>Already in database: {uploadResult.duplicatesOrExisting.toLocaleString()}</div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold hover:bg-zinc-800"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={!uploadFile || uploading}
              className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold disabled:opacity-40"
            >
              {uploading ? 'Uploading...' : 'Save to DNC'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADD SINGLE NUMBER */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => setIsSingleModalOpen(false)}
        title="Add Single DNC Phone Number"
      >
        <form onSubmit={handleSingleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Phone Number *
            </label>
            <input
              type="text"
              value={singlePhone}
              onChange={(e) => setSinglePhone(e.target.value)}
              placeholder="e.g. 555-123-4567 or 5551234567"
              required
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Source / Reason
            </label>
            <input
              type="text"
              value={singleCampaign}
              onChange={(e) => setSingleCampaign(e.target.value)}
              placeholder="e.g. Customer Opt-Out"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={singleNotes}
              onChange={(e) => setSingleNotes(e.target.value)}
              placeholder="e.g. Call center request"
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-white"
            />
          </div>

          {singleError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
              {singleError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsSingleModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={singleSubmitting}
              className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold disabled:opacity-40"
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
