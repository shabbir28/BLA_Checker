import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { sessionApi } from '../../services/api';
import StatusBadge from '../common/StatusBadge';
import LoadingSpinner from '../common/LoadingSpinner';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Database,
  Cpu,
  RefreshCw,
  Download,
  ArrowRight,
  ShieldCheck,
  Eye,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export function LeadCheckerStudio({ onViewSessionDetails, onScrubComplete }) {
  // Step 1: Upload, Step 2: Preview, Step 3: Scrubbing, Step 4: Results
  const [currentStep, setCurrentStep] = useState(1);

  // File Upload State
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Preview State
  const [previewData, setPreviewData] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [sessionName, setSessionName] = useState('');

  // Active Session & Polling State
  const [activeSession, setActiveSession] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fileInputRef = useRef(null);

  // Cleanup polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollInterval]);

  // Handle Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (selectedFile) => {
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!['.csv', '.xlsx', '.xls', '.txt'].includes(ext)) {
      setUploadError('Invalid file type. Please upload a CSV, XLSX, XLS, or TXT file.');
      return;
    }
    setFile(selectedFile);
    setUploadError(null);
  };

  // Upload and parse preview
  const handleUploadPreview = async () => {
    if (!file) return;
    try {
      setUploading(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await sessionApi.preview(formData);
      setPreviewData(res.data);
      setSelectedColumn(res.data.detectedPhoneColumn || res.data.columns[0] || 'phone');
      setSessionName(`Check_${file.name.replace(/\.[^/.]+$/, '')}_${new Date().toISOString().slice(5, 10)}`);
      setCurrentStep(2);
    } catch (err) {
      console.error('[STUDIO] Preview error:', err);
      setUploadError(err.response?.data?.message || 'Failed to inspect lead file. Check file format.');
    } finally {
      setUploading(false);
    }
  };

  // Start checking session
  const handleStartChecking = async () => {
    try {
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

      // Start live polling every 1.2 seconds for real-time progress
      const interval = setInterval(async () => {
        try {
          const checkRes = await sessionApi.get(session.id);
          const updated = checkRes.data.session;
          setActiveSession(updated);

          if (updated.status === 'COMPLETED') {
            clearInterval(interval);
            setCurrentStep(4);
            triggerCelebration();
            if (onScrubComplete) onScrubComplete(updated);
          } else if (updated.status === 'FAILED') {
            clearInterval(interval);
            setErrorMsg(updated.error_message || 'Lead checking failed.');
          }
        } catch (pollErr) {
          console.error('[STUDIO] Polling error:', pollErr);
        }
      }, 1200);

      setPollInterval(interval);
    } catch (err) {
      console.error('[STUDIO] Start session error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to initialize checking session.');
    }
  };

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#10b981', '#06b6d4', '#f59e0b'],
      });
    } catch (e) {}
  };

  const handleReset = () => {
    if (pollInterval) clearInterval(pollInterval);
    setFile(null);
    setPreviewData(null);
    setActiveSession(null);
    setCurrentStep(1);
    setErrorMsg(null);
    setUploadError(null);
  };

  // Steps definition for UI wizard
  const steps = [
    { number: 1, label: 'Upload File' },
    { number: 2, label: 'Column Mapping' },
    { number: 3, label: 'Live Scrubbing' },
    { number: 4, label: 'Results & Export' },
  ];

  return (
    <div className="space-y-6">
      {/* Wizard Step Progress Tracker */}
      <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex items-center justify-between">
        {steps.map((st, idx) => {
          const isDone = currentStep > st.number;
          const isCurrent = currentStep === st.number;
          return (
            <div key={st.number} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : isCurrent
                      ? 'bg-brand-600 text-white ring-4 ring-brand-500/20 shadow-md shadow-brand-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : st.number}
                </div>
                <span
                  className={`text-xs font-medium hidden md:inline ${
                    isCurrent ? 'text-white' : isDone ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {st.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 hidden sm:block ${
                    isDone ? 'bg-emerald-500/50' : 'bg-slate-800'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* STEP 1: UPLOAD FILE */}
      {currentStep === 1 && (
        <div className="p-8 rounded-2xl glass-panel border border-slate-800 space-y-6">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Upload Lead File for Verification
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Supports CSV, XLSX, XLS, and TXT files. System will automatically match against Master DNC first to save API queries.
            </p>
          </div>

          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-brand-500/60 bg-slate-900/40 hover:bg-slate-900/80 rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFileSelected(e.target.files[0])}
              accept=".csv,.xlsx,.xls,.txt"
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>

            {file ? (
              <div className="space-y-1">
                <span className="text-sm font-semibold text-emerald-400 block">{file.name}</span>
                <span className="text-xs text-slate-400 block">
                  {(file.size / 1024).toFixed(1)} KB — Ready to inspect
                </span>
                <span className="text-[11px] text-brand-400 underline block mt-2">
                  Click to choose a different file
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-sm font-medium text-slate-200 block">
                  Drag and drop your file here, or{' '}
                  <span className="text-brand-400 font-semibold underline">browse</span>
                </span>
                <span className="text-xs text-slate-400 block">
                  Supports up to 500,000 phone numbers per file (CSV, XLSX, TXT)
                </span>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={handleUploadPreview}
              disabled={!file || uploading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs md:text-sm font-semibold shadow-lg shadow-brand-500/25 transition cursor-pointer"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Inspecting File Structure...</span>
                </>
              ) : (
                <>
                  <span>Next: Preview & Map Column</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW & COLUMN SELECTION */}
      {currentStep === 2 && previewData && (
        <div className="p-8 rounded-2xl glass-panel border border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Confirm Phone Number Column
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Review the first rows of your file. Select which column contains the phone numbers to scrub.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Back
              </button>
              <button
                onClick={handleStartChecking}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs md:text-sm font-semibold shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              >
                <Cpu className="w-4 h-4" />
                <span>Start Scrubbing Pipeline</span>
              </button>
            </div>
          </div>

          {/* Form Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Session Name
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Enter a descriptive session name..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs md:text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Phone Number Column
              </label>
              <select
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs md:text-sm focus:border-brand-500 focus:outline-none"
              >
                {previewData.columns.map((col) => (
                  <option key={col} value={col}>
                    {col} {col === previewData.detectedPhoneColumn ? '(Auto-Detected)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                File Preview (First 5 Rows)
              </span>
              <span className="text-xs text-brand-400 font-mono">
                Detected: {previewData.detectedPhoneColumn || 'None'}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-900/90 border-b border-slate-800">
                  <tr>
                    {previewData.columns.map((col) => (
                      <th
                        key={col}
                        className={`p-3 font-semibold ${
                          col === selectedColumn ? 'text-brand-400 bg-brand-500/10' : ''
                        }`}
                      >
                        {col}
                        {col === selectedColumn && (
                          <span className="ml-1 text-[10px] text-brand-300 font-normal">
                            [Phone]
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {previewData.previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      {previewData.columns.map((col) => (
                        <td
                          key={col}
                          className={`p-3 text-slate-300 ${
                            col === selectedColumn ? 'font-bold text-white bg-brand-500/5' : ''
                          }`}
                        >
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: LIVE SCRUBBING TERMINAL */}
      {currentStep === 3 && activeSession && (
        <div className="p-8 rounded-2xl glass-panel border border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Scrubbing Pipeline in Progress
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Session: <span className="font-semibold text-slate-200">{activeSession.session_name}</span> (
                {activeSession.original_filename})
              </p>
            </div>

            <StatusBadge status={activeSession.stage || activeSession.status} />
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Pipeline Execution</span>
              <span className="text-brand-400 font-bold">{activeSession.progress_percent || 0}%</span>
            </div>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-brand-600 via-indigo-500 to-cyan-400 transition-all duration-300 rounded-full"
                style={{ width: `${activeSession.progress_percent || 5}%` }}
              />
            </div>
          </div>

          {/* Live Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Total Leads</span>
              <span className="text-xl font-bold text-white font-mono mt-1 block">
                {activeSession.total_rows?.toLocaleString() || 0}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <span className="text-[11px] text-emerald-400 uppercase tracking-wider block">Clean Numbers</span>
              <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
                {activeSession.clean_count?.toLocaleString() || 0}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <span className="text-[11px] text-amber-400 uppercase tracking-wider block">Local DNC Skip</span>
              <span className="text-xl font-bold text-amber-400 font-mono mt-1 block">
                {activeSession.local_dnc_count?.toLocaleString() || 0}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
              <span className="text-[11px] text-rose-400 uppercase tracking-wider block">BLA DNC Match</span>
              <span className="text-xl font-bold text-rose-400 font-mono mt-1 block">
                {activeSession.bla_dnc_count?.toLocaleString() || 0}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20 col-span-2 md:col-span-1">
              <span className="text-[11px] text-cyan-400 uppercase tracking-wider block">API Calls Saved</span>
              <span className="text-xl font-bold text-cyan-400 font-mono mt-1 block">
                {activeSession.api_calls_saved?.toLocaleString() || 0}
              </span>
            </div>
          </div>

          {/* Pipeline Stage Indicators */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex items-center gap-3 text-slate-300">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>1. File ingestion and parsing complete</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>2. Phone number normalization and invalid length filtering</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <span className="text-emerald-400 font-bold">✓</span>
              <span>3. Internal Master DNC pre-matching (Local check performed at 0ms latency)</span>
            </div>
            <div className="flex items-center gap-3 text-brand-300">
              <span className="text-brand-400 animate-pulse font-bold">▶</span>
              <span>4. Fresh numbers verified via BLA API batch queries</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <span className="text-slate-600 font-bold">○</span>
              <span>5. Newly discovered BLA DNC numbers auto-synced into Master DNC table</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              <span className="font-semibold block mb-1">Process Error:</span>
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: RESULTS & EXPORT */}
      {currentStep === 4 && activeSession && (
        <div className="p-8 rounded-2xl glass-panel border border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Scrubbing Completed Successfully!
                </h2>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  Session <span className="text-slate-200 font-semibold">{activeSession.session_name}</span> is ready. Clean numbers have been verified and isolated.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>New Scrub</span>
              </button>

              <button
                onClick={() => onViewSessionDetails(activeSession.id)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs md:text-sm font-semibold shadow-lg shadow-brand-500/25 transition cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Inspect Full Records</span>
              </button>
            </div>
          </div>

          {/* Results Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block mb-1">Total Processed</span>
              <span className="text-2xl font-bold text-white font-mono">
                {activeSession.total_rows?.toLocaleString() || 0}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
              <span className="text-xs text-emerald-400 font-semibold block mb-1">Clean Numbers</span>
              <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                {activeSession.clean_count?.toLocaleString() || 0}
              </span>
              <span className="text-[11px] text-emerald-300/80 block mt-1">
                {activeSession.total_rows > 0
                  ? ((activeSession.clean_count / activeSession.total_rows) * 100).toFixed(1)
                  : 0}
                % Clean Rate
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center">
              <span className="text-xs text-rose-400 font-semibold block mb-1">Total DNC Matched</span>
              <span className="text-2xl font-extrabold text-rose-400 font-mono">
                {((activeSession.local_dnc_count || 0) + (activeSession.bla_dnc_count || 0)).toLocaleString()}
              </span>
              <span className="text-[11px] text-rose-300/80 block mt-1">
                {activeSession.local_dnc_count || 0} Local · {activeSession.bla_dnc_count || 0} BLA
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-center">
              <span className="text-xs text-cyan-400 font-semibold block mb-1">API Cost Saved</span>
              <span className="text-2xl font-extrabold text-cyan-400 font-mono">
                ${((activeSession.api_calls_saved || 0) * 0.005).toFixed(2)}
              </span>
              <span className="text-[11px] text-cyan-300/80 block mt-1">
                {activeSession.api_calls_saved || 0} calls skipped
              </span>
            </div>
          </div>

          {/* One-Click Download Box */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800">
            <h3 className="text-sm font-semibold text-white mb-2">Export Verification Results</h3>
            <p className="text-xs text-slate-400 mb-4">
              Download clean numbers ready for dialer ingestion, or get the complete audit breakdown.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href={sessionApi.getCleanExportUrl(activeSession.id, 'csv')}
                download
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs md:text-sm font-semibold shadow-md shadow-emerald-500/20 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Clean CSV</span>
              </a>

              <a
                href={sessionApi.getCleanExportUrl(activeSession.id, 'xlsx')}
                download
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs md:text-sm font-semibold shadow-md shadow-teal-500/20 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download Clean XLSX</span>
              </a>

              <a
                href={sessionApi.getFullExportUrl(activeSession.id, 'csv')}
                download
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs md:text-sm font-medium border border-slate-700 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Full Audit Report (CSV)</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadCheckerStudio;
