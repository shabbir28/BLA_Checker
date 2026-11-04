import { Download, Loader2 } from 'lucide-react';
import { formatNumber } from '../../utils/format';

const TYPES = [
  { label: 'Wireless', field: 'wireless_count' },
  { label: 'Landline', field: 'landline_count' },
];

export default function LineTypeCards({ session, downloading, onDownload, compact = false }) {
  const ready = session.status === 'COMPLETED' && session.stage === 'DONE' && session.bla_verified !== false;
  return (
    <div className="col-span-full flex justify-center gap-3">
      {TYPES.map(({ label, field }) => {
        const count = session[field] || 0;
        const busy = downloading === `${label}-csv`;
        return (
          <div key={label} className={`w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-2.25rem)/4)] xl:w-[calc((100%-4.5rem)/7)] ${compact ? 'card-raised h-24 p-3.5 text-left text-emerald-300' : 'h-32 rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-3 text-left text-emerald-300'}`}>
            <div className={`flex items-start justify-between gap-1 ${compact ? '' : 'min-h-8'}`}>
              <span className="text-[11px] font-medium opacity-80">{label}</span>
              <button
                type="button"
                className="shrink-0 rounded p-0.5 transition hover:bg-emerald-900/40 focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!ready || !count || Boolean(downloading)}
                onClick={() => onDownload('clean', 'csv', label)}
                aria-label={`Download clean ${label.toLowerCase()} numbers as CSV`}
                title={!ready ? 'Available after BLA checking completes' : !count ? `No clean ${label.toLowerCase()} numbers` : `Download ${label} CSV`}
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              </button>
            </div>
            <span className={`mt-1.5 block font-mono font-bold leading-none ${compact ? 'text-xl' : 'text-2xl'}`}>{formatNumber(count)}</span>
          </div>
        );
      })}
    </div>
  );
}
