import { Download, Loader2 } from 'lucide-react';

export default function CleanDownloadButton({ session, downloading, onDownload }) {
  const ready = session.status === 'COMPLETED' && session.stage === 'DONE' && session.bla_verified !== false;
  return (
    <button
      type="button"
      className="absolute right-3 top-3 rounded p-1 text-emerald-300 transition hover:bg-emerald-900/40 focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-40"
      disabled={!ready || !session.clean_count || Boolean(downloading)}
      onClick={() => onDownload('clean', 'csv')}
      aria-label="Download all clean numbers as CSV"
      title="Download all clean numbers as CSV"
    >
      {downloading === 'clean-csv' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
    </button>
  );
}
