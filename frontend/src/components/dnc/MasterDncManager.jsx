import React, { useEffect, useState, useRef } from 'react';
import { dncApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import { formatNumber, formatCompact } from '../../utils/format';
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
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  Zap,
  Clock,
  AlertCircle,
} from 'lucide-react';

const SOURCE_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'MANUAL_UPLOAD', label: 'Uploaded' },
  { id: 'BLA_SYNC', label: 'BLA synced' },
  { id: 'MANUAL_ENTRY', label: 'Manual' },
];

function sourceChip(source) {
  if (source === 'BLA_SYNC') return <span className="chip-emerald">BLA</span>;
  if (source === 'MANUAL_UPLOAD') return <span className="chip-zinc">Upload</span>;
  if (source === 'MANUAL_ENTRY') return <span className="chip-blue">Manual</span>;
  return <span className="chip-zinc">{source}</span>;
}

export function MasterDncManager() {
  const { isAdmin } = useAuth();

  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);

  const [uploadFile, setUploadFile] = useState(null);
  const [campaignName, setCampaignName] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState('idle');
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

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
      const res = await dncApi.list({ page: targetPage, limit: 50, source: targetSource, search: targetSearch });
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

  const openUploadModal = () => {
    setUploadFile(null);
    setUploadResult(null);
    setUploadError(null);
    setUploadProgress(0);
    setUploadPhase('idle');
    setCampaignName('');
    setUploadNotes('');
    setIsUploadModalOpen(true);
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
        if (percent >= 100) setUploadPhase('processing');
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
      await dncApi.addSingle({ phone: singlePhone, campaign: singleCampaign, notes: singleNotes });
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
    if (!window.confirm('Remove this phone number from the Master DNC list?')) return;
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

  if (loading) return <LoadingSpinner message="Loading Master DNC…" size="lg" />;

  const bySource = (key) => Number(stats?.bySource?.find((s) => s.source === key)?.count || 0);
  const totalCount = stats?.total || 0;
  const statTiles = [
    { icon: Database, label: 'Total records', value: formatCompact(totalCount), full: formatNumber(totalCount), cls: 'text-white' },
    { icon: Zap, label: 'BLA synced', value: formatCompact(bySource('BLA_SYNC')), full: formatNumber(bySource('BLA_SYNC')), cls: 'text-emerald-300' },
    { icon: FileSpreadsheet, label: 'Uploaded', value: formatCompact(bySource('MANUAL_UPLOAD') + bySource('INITIAL_SEED')), full: formatNumber(bySource('MANUAL_UPLOAD') + bySource('INITIAL_SEED')), cls: 'text-white' },
    { icon: Clock, label: 'Added last 24h', value: formatCompact(stats?.addedLast24h || 0), full: formatNumber(stats?.addedLast24h || 0), cls: 'text-cyan-300' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="eyebrow">Suppression list</span>
          <h2 className="page-title mt-1">DNC Upload</h2>
          <p className="page-subtitle">Numbers on this list are filtered locally before any paid Blacklist Alliance lookup.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={refreshAll} className="btn-icon" title="Refresh" aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
          <a href={dncApi.getExportUrl(sourceFilter)} download className="btn-secondary">
            <Download className="h-4 w-4" /> Export
          </a>
          {isAdmin && (
            <>
              <button onClick={() => setIsSingleModalOpen(true)} className="btn-secondary">
                <Plus className="h-4 w-4" /> Add number
              </button>
              <button onClick={openUploadModal} className="btn-primary">
                <UploadCloud className="h-4 w-4" /> Upload DNC list
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {statTiles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} className="card card-hover p-4" title={t.full}>
              <div className="flex items-center justify-between text-zinc-500">
                <span className="text-[11px] font-medium">{t.label}</span>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className={`mt-1.5 block font-mono text-xl font-bold leading-none ${t.cls}`}>{t.value}</span>
            </div>
          );
        })}
      </div>

      <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-surface-border bg-surface-raised p-1">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSourceChange(tab.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                sourceFilter === tab.id ? 'bg-surface-card text-white shadow-sm ring-1 ring-surface-border-strong' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search phone number… (Enter)"
            className="input input-with-icon py-2 font-mono"
          />
        </form>
      </div>

      <section className="card overflow-hidden">
        {tableLoading ? (
          <LoadingSpinner message="Searching…" />
        ) : records.length === 0 ? (
          <EmptyState
            icon={Database}
            title="No DNC numbers found"
            description="Upload a DNC list or add numbers individually."
            actionLabel={isAdmin ? 'Upload DNC list' : undefined}
            onAction={openUploadModal}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Phone</th>
                    <th>Normalized</th>
                    <th>Source</th>
                    <th>File / campaign</th>
                    <th>Added</th>
                    {isAdmin && <th className="text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => (
                    <tr key={rec.id}>
                      <td className="font-mono text-zinc-400">{rec.phone_number}</td>
                      <td className="font-mono font-semibold text-white">{rec.normalized_phone}</td>
                      <td>{sourceChip(rec.source)}</td>
                      <td className="max-w-[220px] truncate text-xs text-zinc-400">{rec.campaign_or_file || '—'}</td>
                      <td className="whitespace-nowrap text-xs text-zinc-500">{new Date(rec.created_at).toLocaleDateString()}</td>
                      {isAdmin && (
                        <td className="text-right">
                          <button
                            onClick={() => handleDeleteRecord(rec.id)}
                            className="btn-icon hover:!border-red-900/60 hover:!text-red-400"
                            title="Remove"
                            aria-label="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      )}
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

      {/* Upload modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload DNC list"
        description="CSV, Excel or TXT. Numbers are normalized and de-duplicated automatically."
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
              uploadFile ? 'border-emerald-800/60 bg-emerald-950/10' : 'border-surface-border-strong bg-surface-raised/40 hover:border-zinc-600'
            }`}
          >
            <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && setUploadFile(e.target.files[0])} accept=".csv,.xlsx,.xls,.txt" className="hidden" />
            <UploadCloud className={`mx-auto mb-2 h-6 w-6 ${uploadFile ? 'text-emerald-400' : 'text-zinc-400'}`} />
            {uploadFile ? (
              <>
                <p className="text-sm font-semibold text-white">{uploadFile.name}</p>
                <p className="font-mono text-[11px] text-zinc-500">{(uploadFile.size / 1024).toFixed(1)} KB</p>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-200">Click to select a file</p>
                <p className="text-[11px] text-zinc-500">The phone column is detected automatically</p>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="campaignName" className="label">List name</label>
              <input id="campaignName" type="text" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="e.g. National_DNC_Update" className="input" />
            </div>
            <div>
              <label htmlFor="uploadNotes" className="label">Notes (optional)</label>
              <input id="uploadNotes" type="text" value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)} placeholder="e.g. Added by compliance team" className="input" />
            </div>
          </div>

          {uploading && (
            <div className="card-raised space-y-2.5 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-medium text-zinc-200">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                  {uploadPhase === 'processing' ? 'Processing on server…' : 'Uploading file…'}
                </span>
                {uploadPhase !== 'processing' && (
                  <span className="font-mono font-semibold text-emerald-300">{uploadProgress}%</span>
                )}
              </div>

              {uploadPhase === 'processing' ? (
                <>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-page">
                    <div className="h-full w-2/5 rounded-full bg-emerald-500 animate-[shimmer_1.4s_ease-in-out_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, #10b981, transparent)', backgroundSize: '200% 100%' }} />
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    File received. Normalizing, de-duplicating and importing numbers — large lists can take a minute.
                  </p>
                </>
              ) : (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-page">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-200" style={{ width: `${Math.max(4, uploadProgress)}%` }} />
                </div>
              )}
            </div>
          )}

          {uploadError && (
            <div className="alert-error" role="alert">
              <AlertCircle className="mt-px h-4 w-4 shrink-0 text-red-400" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadResult && (
            <div className="alert-success flex-col !items-stretch gap-3">
              <div className="flex items-center gap-2 font-semibold text-white">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Import complete
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['New added', uploadResult.addedNew, 'text-emerald-300'],
                  ['Already existed', uploadResult.duplicatesOrExisting, 'text-zinc-200'],
                  ['Invalid', uploadResult.invalidCount, 'text-zinc-400'],
                ].map(([l, v, c]) => (
                  <div key={l} className="rounded-lg border border-emerald-900/40 bg-surface-page/60 p-2.5">
                    <span className="block text-[10px] text-zinc-500">{l}</span>
                    <span className={`font-mono text-base font-bold ${c}`}>{formatNumber(v)}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-zinc-400">
                Rows evaluated: <span className="font-mono text-zinc-200">{formatNumber(uploadResult.totalRows)}</span>
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setIsUploadModalOpen(false)} className="btn-secondary">
              {uploadResult ? 'Done' : 'Cancel'}
            </button>
            <button type="submit" disabled={!uploadFile || uploading} className="btn-primary">
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {uploadProgress < 100 ? `Uploading ${uploadProgress}%` : 'Importing…'}
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" /> Upload & import
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Single-number modal */}
      <Modal isOpen={isSingleModalOpen} onClose={() => setIsSingleModalOpen(false)} title="Add a DNC number" size="sm">
        <form onSubmit={handleSingleSubmit} className="space-y-4">
          <div>
            <label htmlFor="singlePhone" className="label">Phone number</label>
            <input id="singlePhone" type="tel" value={singlePhone} onChange={(e) => setSinglePhone(e.target.value)} placeholder="e.g. (555) 123-4567" required className="input font-mono" />
          </div>
          <div>
            <label htmlFor="singleCampaign" className="label">Source / reason</label>
            <input id="singleCampaign" type="text" value={singleCampaign} onChange={(e) => setSingleCampaign(e.target.value)} placeholder="e.g. Customer opt-out" className="input" />
          </div>
          <div>
            <label htmlFor="singleNotes" className="label">Notes (optional)</label>
            <input id="singleNotes" type="text" value={singleNotes} onChange={(e) => setSingleNotes(e.target.value)} placeholder="e.g. Call center request" className="input" />
          </div>

          {singleError && (
            <div className="alert-error" role="alert">
              <AlertCircle className="mt-px h-4 w-4 shrink-0 text-red-400" />
              <span>{singleError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setIsSingleModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={singleSubmitting} className="btn-primary">
              {singleSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add number
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default MasterDncManager;
