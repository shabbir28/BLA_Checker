import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { sessionApi } from '../../services/api';
import StatusBadge from '../common/StatusBadge';
import {
  UploadCloud,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  Eye,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';

export function LeadCheckerStudio({ onViewSessionDetails, onScrubComplete }) {
  // Steps: 1: Upload File, 2: Select Column, 3: Checking, 4: Results
  const [currentStep, setCurrentStep] = useState(1);

  // File Upload State
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  // Preview State
  const [previewData, setPreviewData] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [sessionName, setSessionName] = useState('');

  // Active Session & Polling
  const [activeSession, setActiveSession] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pollInterval]);

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (selectedFile) => {
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!['.csv', '.xlsx', '.xls', '.txt'].includes(ext)) {
      setUploadError('Please upload a CSV, Excel (.xlsx), or TXT file.');
      return;
    }
    setFile(selectedFile);
    setUploadProgress(0);
    setUploadError(null);
  };

  const handleUploadPreview = async () => {
    if (!file) return;
    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadError(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await sessionApi.preview(formData, (percent) => {
        setUploadProgress(percent);
      });
      setPreviewData(res.data);
      setSelectedColumn(res.data.detectedPhoneColumn || res.data.columns[0] || 'phone');
      setSessionName(`Check_${file.name.replace(/\.[^/.]+$/, '')}`);
      setCurrentStep(2);
    } catch (err) {
      console.error('[STUDIO] Preview error:', err);
      setUploadError(err.response?.data?.message || 'Could not read file. Please verify file format.');
    } finally {
      setUploading(false);
    }
  };

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
            } catch (e) {}
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
  };

  const steps = [
    { number: 1, label: 'Upload File' },
    { number: 2, label: 'Select Phone Column' },
    { number: 3, label: 'Checking Numbers' },
    { number: 4, label: 'Download Clean' },
  ];

  return (
    <div className="space-y-6">
      {/* Wizard Step Progress Tracker */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
        {steps.map((st, idx) => {
          const isDone = currentStep > st.number;
          const isCurrent = currentStep === st.number;
          return (
            <div key={st.number} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${
                    isDone
                      ? 'bg-emerald-500 text-black'
                      : isCurrent
                      ? 'bg-white text-black ring-2 ring-white/30'
                      : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4 text-black" /> : st.number}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    isCurrent ? 'text-white' : isDone ? 'text-zinc-300' : 'text-zinc-500'
                  }`}
                >
                  {st.label}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-3 hidden sm:block ${
                    isDone ? 'bg-emerald-500/50' : 'bg-zinc-800'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* STEP 1: UPLOAD FILE */}
      {currentStep === 1 && (
        <div className="p-8 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-6">
          <div className="text-center max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-white tracking-tight">Upload Lead File</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Select or drop your contact file. We will check every number against your DNC upload list and the BLA API.
            </p>
          </div>

          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-800 hover:border-zinc-600 bg-zinc-900/40 rounded-2xl p-10 text-center cursor-pointer transition group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFileSelected(e.target.files[0])}
              accept=".csv,.xlsx,.xls,.txt"
              className="hidden"
            />
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-8 h-8 text-emerald-400" />
            </div>

            {file ? (
              <div className="space-y-1">
                <span className="text-sm font-bold text-white block">{file.name}</span>
                <span className="text-xs text-zinc-400 block font-mono">
                  {(file.size / 1024).toFixed(1)} KB · Ready to check
                </span>
                <span className="text-xs text-zinc-400 underline block mt-2">
                  Click to select a different file
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-sm font-semibold text-white block">
                  Click to choose file, or drag and drop here
                </span>
                <span className="text-xs text-zinc-500 block">
                  Supports CSV, Excel (.xlsx), or TXT
                </span>
              </div>
            )}
          </div>

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {uploadProgress < 100 ? `Uploading file (${uploadProgress}%)...` : 'Reading file structure...'}
                </span>
                <span className="text-emerald-400 font-bold font-mono">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-150"
                  style={{ width: `${Math.max(5, uploadProgress)}%` }}
                />
              </div>
            </div>
          )}

          {uploadError && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleUploadPreview}
              disabled={!file || uploading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-40 text-black text-xs md:text-sm font-bold transition cursor-pointer shadow-md shadow-white/5"
            >
              <span>{uploading ? (uploadProgress < 100 ? `Uploading ${uploadProgress}%...` : 'Reading...') : 'Next Step'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SELECT PHONE COLUMN */}
      {currentStep === 2 && previewData && (
        <div className="p-8 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Select Phone Column</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Tell us which column in your file contains the phone numbers.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold"
              >
                Back
              </button>
              <button
                onClick={handleStartChecking}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs md:text-sm font-bold transition cursor-pointer shadow-md shadow-emerald-500/20"
              >
                <span>Start Checking</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Session Name
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Name this checking session"
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs md:text-sm focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Which Column Has Phone Numbers?
              </label>
              <select
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs md:text-sm focus:outline-none focus:border-white"
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
            <span className="text-xs font-semibold text-zinc-400 block mb-2">
              File Preview (First 5 Rows)
            </span>
            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                  <tr>
                    {previewData.columns.map((col) => (
                      <th
                        key={col}
                        className={`p-3 font-semibold ${
                          col === selectedColumn ? 'text-emerald-400 bg-emerald-950/20' : ''
                        }`}
                      >
                        {col}
                        {col === selectedColumn && (
                          <span className="ml-1 text-[10px] text-emerald-300">[Phone Column]</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 font-mono">
                  {previewData.previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/60">
                      {previewData.columns.map((col) => (
                        <td
                          key={col}
                          className={`p-3 text-zinc-300 ${
                            col === selectedColumn ? 'font-bold text-white bg-emerald-950/10' : ''
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

      {/* STEP 3: CHECKING IN PROGRESS */}
      {currentStep === 3 && activeSession && (
        <div className="p-8 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-xl font-bold text-white tracking-tight">Checking Numbers...</h2>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                {activeSession.original_filename}
              </p>
            </div>
            <StatusBadge status={activeSession.status} />
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-400">Checking Progress</span>
              <span className="text-emerald-400 font-bold">{activeSession.progress_percent || 0}%</span>
            </div>
            <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${activeSession.progress_percent || 5}%` }}
              />
            </div>
          </div>

          {/* Live Counters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-xs text-zinc-400 block mb-1">Total in File</span>
              <span className="text-xl font-bold text-white font-mono">
                {activeSession.total_rows?.toLocaleString() || 0}
              </span>
              <span className="text-[10px] text-zinc-500 block mt-0.5">Uploaded numbers</span>
            </div>

            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/40">
              <span className="text-xs text-amber-400 font-medium block mb-1">Already in DNC DB</span>
              <span className="text-xl font-bold text-amber-400 font-mono">
                {activeSession.local_dnc_count?.toLocaleString() || 0}
              </span>
              <span className="text-[10px] text-amber-400/80 block mt-0.5">Skipped from BLA</span>
            </div>

            <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/40">
              <span className="text-xs text-red-400 font-medium block mb-1">DNC from BLA</span>
              <span className="text-xl font-bold text-red-400 font-mono">
                {activeSession.bla_dnc_count?.toLocaleString() || 0}
              </span>
              <span className="text-[10px] text-red-400/80 block mt-0.5">Added to DNC list</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40">
              <span className="text-xs text-emerald-400 font-medium block mb-1">Fresh Numbers</span>
              <span className="text-xl font-bold text-emerald-400 font-mono">
                {activeSession.clean_count?.toLocaleString() || 0}
              </span>
              <span className="text-[10px] text-emerald-500 block mt-0.5">Safe & Clean</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs">
              <span className="font-bold block mb-1">Error:</span>
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: RESULTS & DOWNLOAD */}
      {currentStep === 4 && activeSession && (
        <div className="p-8 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-6">
          <div className="text-center max-w-lg mx-auto space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto mb-2 shadow-xl shadow-emerald-950/40">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Checking Complete!</h2>
            <p className="text-xs md:text-sm text-zinc-400">
              Your file <span className="text-white font-mono font-semibold">{activeSession.original_filename}</span> has been completely checked. Clean numbers are ready for download.
            </p>
          </div>

          {/* 4 Cards: Total in File, Already in DB, From BLA, Fresh Numbers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {/* 1. Total Numbers in File */}
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <span className="text-xs text-zinc-400 block mb-1">Total in File</span>
              <span className="text-2xl font-bold text-white font-mono">
                {activeSession.total_rows?.toLocaleString() || 0}
              </span>
              <span className="text-[11px] text-zinc-500 block mt-1">Uploaded leads</span>
            </div>

            {/* 2. Already in DNC Database */}
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-900/50">
              <span className="text-xs text-amber-400 font-bold block mb-1">Already in DNC Database</span>
              <span className="text-2xl font-extrabold text-amber-400 font-mono">
                {activeSession.local_dnc_count?.toLocaleString() || 0}
              </span>
              <span className="text-[11px] text-amber-400/80 block mt-1">
                Skipped BLA API
              </span>
            </div>

            {/* 3. DNC from BLA */}
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/50">
              <span className="text-xs text-red-400 font-bold block mb-1">DNC from BLA</span>
              <span className="text-2xl font-extrabold text-red-400 font-mono">
                {activeSession.bla_dnc_count?.toLocaleString() || 0}
              </span>
              <span className="text-[11px] text-red-400/80 block mt-1">
                Saved to Master DNC
              </span>
            </div>

            {/* 4. Fresh Numbers */}
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60">
              <span className="text-xs text-emerald-400 font-bold block mb-1">Fresh Numbers</span>
              <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                {activeSession.clean_count?.toLocaleString() || 0}
              </span>
              <span className="text-[11px] text-emerald-400/80 block mt-1">
                {activeSession.total_rows > 0
                  ? ((activeSession.clean_count / activeSession.total_rows) * 100).toFixed(1)
                  : 0}
                % Clean Verified
              </span>
            </div>
          </div>

          {/* Download Action Box */}
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Download Your Results</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Download verified clean phone numbers or download the complete audit report.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href={sessionApi.getCleanExportUrl(activeSession.id, 'csv')}
                download
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs md:text-sm font-bold shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Clean Numbers (CSV)</span>
              </a>

              <a
                href={sessionApi.getCleanExportUrl(activeSession.id, 'xlsx')}
                download
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs md:text-sm font-semibold transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Download Clean Numbers (Excel)</span>
              </a>

              <a
                href={sessionApi.getFullExportUrl(activeSession.id, 'csv')}
                download
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-medium transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Full Report (CSV)</span>
              </a>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Check Another File</span>
            </button>

            <button
              onClick={() => onViewSessionDetails(activeSession.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View All Numbers</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadCheckerStudio;
