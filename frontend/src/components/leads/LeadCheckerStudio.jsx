import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { sessionApi } from '../../services/api';
import StatusBadge from '../common/StatusBadge';
import { formatNumber, safeRate } from '../../utils/format';
import {
  UploadCloud,
  Check,
  AlertCircle,
  Download,
  ArrowRight,
  ArrowLeft,
  Eye,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  FileText,
  Loader2,
  Database,
  Zap,
  ShieldCheck,
  ListChecks,
} from 'lucide-react';

const STEPS = [
  { number: 1, label: 'Upload file' },
  { number: 2, label: 'Choose column' },
  { number: 3, label: 'Checking' },
  { number: 4, label: 'Download' },
];

const STAGE_LABELS = {
  IDLE: 'Queued',
  PARSING: 'Reading file',
  DEDUPLICATING: 'Removing duplicates',
  LOCAL_SCRUB: 'Matching against Master DNC',
  BLA_VERIFY: 'Verifying with Blacklist Alliance',
  SYNCING: 'Syncing new DNC numbers',
  FINALIZING: 'Saving results',
  DONE: 'Completed',
  FAILED: 'Failed',
};

function StepTracker({ current }) {
  return (
    <ol className="card flex items-center gap-2 px-4 py-3 sm:px-5">
      {STEPS.map((st, idx) => {
        const done = current > st.number;
        const active = current === st.number;
        return (
          <li key={st.number} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  done
                    ? 'bg-emerald-500 text-black'
                    : active
                    ? 'bg-white text-black ring-4 ring-white/10'
                    : 'border border-surface-border bg-surface-raised text-zinc-500'
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : st.number}
              </span>
              <span
                className={`hidden text-xs font-medium sm:inline ${
                  active ? 'text-white' : done ? 'text-zinc-300' : 'text-zinc-500'
                }`}
              >
                {st.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <span className={`mx-3 hidden h-px flex-1 sm:block ${done ? 'bg-emerald-500/60' : 'bg-surface-border'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StatTile({ label, value, hint, tone = 'zinc', icon: Icon }) {
  const tones = {
    zinc: 'border-surface-border bg-surface-raised text-white',
    amber: 'border-amber-900/50 bg-amber-950/30 text-amber-300',
    red: 'border-red-900/50 bg-red-950/30 text-red-300',
    emerald: 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300',
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium opacity-80">{label}</span>
        {Icon && <Icon className="h-3.5 w-3.5 opacity-70" />}
      </div>
      <span className="mt-1.5 block font-mono text-2xl font-bold leading-none">{value}</span>
      {hint && <span className="mt-1.5 block text-[11px] opacity-60">{hint}</span>}
    </div>
  );
}

export function LeadCheckerStudio({ onViewSessionDetails, onScrubComplete }) {
  const [currentStep, setCurrentStep] = useState(1);

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const [previewData, setPreviewData] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [sessionName, setSessionName] = useState('');

  const [activeSession, setActiveSession] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [starting, setStarting] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollInterval]);

  const handleFileSelected = (selectedFile) => {
    if (!selectedFile) return;
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!['.csv', '.xlsx', '.xls', '.txt'].includes(ext)) {
      setUploadError('Please upload a CSV, Excel (.xlsx / .xls), or TXT file.');
      return;
    }
    setFile(selectedFile);
    setUploadProgress(0);
    setUploadError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelected(e.dataTransfer.files?.[0]);
  };

  const handleUploadPreview = async () => {
    if (!file) return;
    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadError(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await sessionApi.preview(formData, setUploadProgress);
      setPreviewData(res.data);
      setSelectedColumn(res.data.detectedPhoneColumn || res.data.columns[0] || 'phone');
      setSessionName(`Check_${file.name.replace(/\.[^/.]+$/, '')}`);
      setCurrentStep(2);
    } catch (err) {
      console.error('[STUDIO] Preview error:', err);
      setUploadError(err.response?.data?.message || 'Could not read file. Please verify the file format.');
    } finally {
      setUploading(false);
    }
  };

  const handleStartChecking = async () => {
    if (starting) return;
    try {
      setStarting(true);
      setErrorMsg(null);
      const res = await sessionApi.start({
        tempFileId: previewData.tempFileId,
        sessionName: sessionName.trim(),
        phoneColumn: selectedColumn,
        originalFilename: previewData.originalFilename,
      });

      const session = res.data.session;
      setActiveSession(session);
      setCurrentStep(3);

      const interval = setInterval(async () => {
        try {
          const checkRes = await sessionApi.get(session.id);
          const updated = checkRes.data.session;
          setActiveSession(updated);

          if (updated.status === 'COMPLETED') {
            clearInterval(interval);
            setCurrentStep(4);
            try {
              confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
            } catch {}
            if (onScrubComplete) onScrubComplete(updated);
          } else if (updated.status === 'FAILED') {
            clearInterval(interval);
            setErrorMsg(updated.error_message || 'Checking failed.');
          }
        } catch (pollErr) {
          console.error('[STUDIO] Polling error:', pollErr);
        }
      }, 1000);

      setPollInterval(interval);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to start checking.');
    } finally {
      setStarting(false);
    }
  };

  const handleReset = () => {
    if (pollInterval) clearInterval(pollInterval);
    setFile(null);
    setPreviewData(null);
    setActiveSession(null);
    setCurrentStep(1);
    setErrorMsg(null);
    setUploadError(null);
    setUploadProgress(0);
  };

  const progress = Number(activeSession?.progress_percent) || 0;
  const cleanRate = activeSession ? safeRate(activeSession.clean_count, activeSession.total_rows) : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <StepTracker current={currentStep} />

      {/* ---------------- STEP 1: UPLOAD ---------------- */}
      {currentStep === 1 && (
        <div className="mx-auto w-full max-w-3xl">
          <section className="card p-6 sm:p-8">
            <header className="mb-6">
              <h2 className="text-lg font-semibold text-white">Upload a lead file</h2>
              <p className="mt-1 text-sm text-zinc-400">
                We'll check every number against your Master DNC list, then verify the rest with Blacklist Alliance.
              </p>
            </header>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInputRef.current?.click()}
              className={`group cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
                dragOver
                  ? 'border-emerald-500/70 bg-emerald-950/20'
                  : file
                  ? 'border-emerald-800/60 bg-emerald-950/10'
                  : 'border-surface-border-strong bg-surface-raised/40 hover:border-zinc-600'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileSelected(e.target.files?.[0])}
                accept=".csv,.xlsx,.xls,.txt"
                className="hidden"
              />

              <div
                className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border transition-transform group-hover:scale-105 ${
                  file ? 'border-emerald-800/60 bg-emerald-950/40 text-emerald-400' : 'border-surface-border bg-surface-card text-zinc-300'
                }`}
              >
                {file ? <FileSpreadsheet className="h-7 w-7" /> : <UploadCloud className="h-7 w-7" />}
              </div>

              {file ? (
                <>
                  <p className="text-sm font-semibold text-white">{file.name}</p>
                  <p className="mt-1 font-mono text-xs text-zinc-400">{(file.size / 1024).toFixed(1)} KB · ready</p>
                  <p className="mt-3 text-xs text-zinc-500 underline-offset-2 group-hover:underline">Choose a different file</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-white">Drop your file here, or click to browse</p>
                  <p className="mt-1 text-xs text-zinc-500">CSV, Excel (.xlsx / .xls) or TXT · up to 150 MB</p>
                </>
              )}
            </div>

            {uploading && (
              <div className="card-raised mt-5 space-y-2.5 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-medium text-zinc-200">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                    {uploadProgress < 100 ? 'Uploading file…' : 'Reading file structure…'}
                  </span>
                  <span className="font-mono font-semibold text-emerald-300">{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-page">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-200" style={{ width: `${Math.max(4, uploadProgress)}%` }} />
                </div>
              </div>
            )}

            {uploadError && (
              <div className="alert-error mt-5" role="alert">
                <AlertCircle className="mt-px h-4 w-4 shrink-0 text-red-400" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button onClick={handleUploadPreview} disabled={!file || uploading} className="btn-primary">
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {uploadProgress < 100 ? `Uploading ${uploadProgress}%` : 'Reading…'}
                  </>
                ) : (
                  <>
                    Continue <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ---------------- STEP 2: COLUMN ---------------- */}
      {currentStep === 2 && previewData && (
        <section className="card p-6 sm:p-8">
          <header className="mb-6 flex flex-col gap-4 border-b border-surface-border pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Confirm the phone column</h2>
              <p className="mt-1 text-sm text-zinc-400">
                We detected <span className="font-mono text-emerald-300">{previewData.detectedPhoneColumn || '—'}</span>.
                Change it if needed, then start checking.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentStep(1)} className="btn-secondary">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button onClick={handleStartChecking} disabled={starting} className="btn-success">
                {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
                {starting ? 'Starting…' : 'Start checking'}
              </button>
            </div>
          </header>

          {errorMsg && (
            <div className="alert-error mb-5" role="alert">
              <AlertCircle className="mt-px h-4 w-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="sessionName" className="label">Session name</label>
              <input
                id="sessionName"
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Name this check"
                className="input"
              />
            </div>
            <div>
              <label htmlFor="phoneColumn" className="label">Phone number column</label>
              <select id="phoneColumn" value={selectedColumn} onChange={(e) => setSelectedColumn(e.target.value)} className="select">
                {previewData.columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                    {col === previewData.detectedPhoneColumn ? '  (detected)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="eyebrow">Preview · first {previewData.previewRows.length} rows</span>
              <span className="font-mono text-[11px] text-zinc-500">{previewData.originalFilename}</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-surface-border">
              <table className="table text-xs">
                <thead>
                  <tr>
                    {previewData.columns.map((col) => (
                      <th key={col} className={col === selectedColumn ? '!bg-emerald-950/40 !text-emerald-300' : ''}>
                        {col}
                        {col === selectedColumn && <span className="ml-1.5 normal-case tracking-normal text-emerald-500">· phone</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {previewData.previewRows.map((row, idx) => (
                    <tr key={idx}>
                      {previewData.columns.map((col) => (
                        <td key={col} className={`!py-2.5 ${col === selectedColumn ? 'bg-emerald-950/15 font-semibold text-white' : ''}`}>
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- STEP 3: PROCESSING ---------------- */}
      {currentStep === 3 && activeSession && (
        <section className="card p-6 sm:p-8">
          <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
                <h2 className="text-lg font-semibold text-white">Checking numbers…</h2>
              </div>
              <p className="mt-1 font-mono text-xs text-zinc-500">{activeSession.original_filename}</p>
            </div>
            <StatusBadge status={activeSession.status} />
          </header>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300">{STAGE_LABELS[activeSession.stage] || activeSession.stage || 'Working'}</span>
              <span className="font-mono font-semibold text-emerald-300">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                style={{ width: `${Math.max(4, progress)}%` }}
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Total in file" value={formatNumber(activeSession.total_rows)} hint="Uploaded numbers" icon={FileText} />
            <StatTile label="Already in DNC" value={formatNumber(activeSession.local_dnc_count)} hint="Skipped BLA API" tone="amber" icon={Database} />
            <StatTile label="DNC from BLA" value={formatNumber(activeSession.bla_dnc_count)} hint="Added to Master DNC" tone="red" icon={Zap} />
            <StatTile label="Clean numbers" value={formatNumber(activeSession.clean_count)} hint="Safe to dial" tone="emerald" icon={ShieldCheck} />
          </div>

          {errorMsg && (
            <div className="alert-error mt-6" role="alert">
              <AlertCircle className="mt-px h-4 w-4 shrink-0 text-red-400" />
              <div>
                <p className="font-semibold">Checking failed</p>
                <p className="mt-0.5 text-red-300/90">{errorMsg}</p>
                <button onClick={handleReset} className="btn-secondary btn-sm mt-3">
                  <RotateCcw className="h-3.5 w-3.5" /> Try another file
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ---------------- STEP 4: RESULTS ---------------- */}
      {currentStep === 4 && activeSession && (
        <section className="card p-6 sm:p-8">
          <header className="mx-auto mb-8 max-w-lg text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-800/60 bg-emerald-950/50 text-emerald-400 shadow-glow">
              <Sparkles className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Check complete</h2>
            <p className="mt-2 text-sm text-zinc-400">
              <span className="font-mono text-zinc-200">{activeSession.original_filename}</span> has been fully verified.
              Your clean list is ready to download.
            </p>
          </header>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Total in file" value={formatNumber(activeSession.total_rows)} hint="Uploaded numbers" icon={FileText} />
            <StatTile label="Already in DNC" value={formatNumber(activeSession.local_dnc_count)} hint="Skipped BLA API" tone="amber" icon={Database} />
            <StatTile label="DNC from BLA" value={formatNumber(activeSession.bla_dnc_count)} hint="Saved to Master DNC" tone="red" icon={Zap} />
            <StatTile label="Clean numbers" value={formatNumber(activeSession.clean_count)} hint={`${cleanRate.toFixed(1)}% of file`} tone="emerald" icon={ShieldCheck} />
          </div>

          <div className="card-raised mt-6 p-5 text-center">
            <h3 className="text-sm font-semibold text-white">Download your results</h3>
            <p className="mt-0.5 text-xs text-zinc-500">Clean numbers keep all original columns. The full report includes every number and its status.</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
              <a href={sessionApi.getCleanExportUrl(activeSession.id, 'csv')} download className="btn-success">
                <Download className="h-4 w-4" /> Clean numbers (CSV)
              </a>
              <a href={sessionApi.getCleanExportUrl(activeSession.id, 'xlsx')} download className="btn-secondary">
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" /> Clean numbers (Excel)
              </a>
              <a href={sessionApi.getFullExportUrl(activeSession.id, 'csv')} download className="btn-ghost">
                <Download className="h-4 w-4" /> Full report (CSV)
              </a>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse items-stretch justify-between gap-2 sm:flex-row sm:items-center">
            <button onClick={handleReset} className="btn-secondary">
              <RotateCcw className="h-4 w-4" /> Check another file
            </button>
            <button onClick={() => onViewSessionDetails(activeSession.id)} className="btn-secondary">
              <Eye className="h-4 w-4" /> View every number
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default LeadCheckerStudio;
