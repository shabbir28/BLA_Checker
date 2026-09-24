import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';

export function DateRangeSelector({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsCustomMode(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute date ranges based on today
  const getComputedRanges = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    // Today
    const todayStr = formatDate(now);

    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    // This Week (Monday to Sunday)
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const thisWeekStr = `${formatDate(monday)} – ${formatDate(sunday)}`;

    // Last Week
    const lastMonday = new Date(monday);
    lastMonday.setDate(monday.getDate() - 7);
    const lastSunday = new Date(sunday);
    lastSunday.setDate(sunday.getDate() - 7);
    const lastWeekStr = `${formatDate(lastMonday)} – ${formatDate(lastSunday)}`;

    // This Month
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const thisMonthStr = `${formatDate(thisMonthStart)} – ${formatDate(thisMonthEnd)}`;

    // Last Month
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthStr = `${formatDate(lastMonthStart)} – ${formatDate(lastMonthEnd)}`;

    // Helpers to get local start and end of day as accurate ISO timestamps
    const toStartIso = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString();
    const toEndIso = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString();

    return {
      today: { label: 'Today', dateString: todayStr, start: toStartIso(now), end: toEndIso(now) },
      yesterday: { label: 'Yesterday', dateString: yesterdayStr, start: toStartIso(yesterday), end: toEndIso(yesterday) },
      this_week: { label: 'This Week', dateString: thisWeekStr, start: toStartIso(monday), end: toEndIso(sunday) },
      last_week: { label: 'Last Week', dateString: lastWeekStr, start: toStartIso(lastMonday), end: toEndIso(lastSunday) },
      this_month: { label: 'This Month', dateString: thisMonthStr, start: toStartIso(thisMonthStart), end: toEndIso(thisMonthEnd) },
      last_month: { label: 'Last Month', dateString: lastMonthStr, start: toStartIso(lastMonthStart), end: toEndIso(lastMonthEnd) },
    };
  };

  const ranges = getComputedRanges();

  const options = [
    { id: 'today', label: 'Today', dates: ranges.today.dateString, payload: ranges.today },
    { id: 'yesterday', label: 'Yesterday', dates: ranges.yesterday.dateString, payload: ranges.yesterday },
    { id: 'this_week', label: 'This Week', dates: ranges.this_week.dateString, payload: ranges.this_week },
    { id: 'last_week', label: 'Last Week', dates: ranges.last_week.dateString, payload: ranges.last_week },
    { id: 'this_month', label: 'This Month', dates: ranges.this_month.dateString, payload: ranges.this_month },
    { id: 'last_month', label: 'Last Month', dates: ranges.last_month.dateString, payload: ranges.last_month },
    { id: 'custom', label: 'Custom Range', dates: null, isCustom: true },
  ];

  const currentSelection = value?.id || 'today';
  const currentLabel =
    value?.id === 'custom'
      ? `${value.startDate ? new Date(value.startDate).toLocaleDateString() : 'Start'} – ${value.endDate ? new Date(value.endDate).toLocaleDateString() : 'End'}`
      : options.find((o) => o.id === currentSelection)?.label || 'Today';

  const handleSelect = (opt) => {
    if (opt.isCustom) {
      setIsCustomMode(true);
      return;
    }
    setIsCustomMode(false);
    setIsOpen(false);
    if (onChange) {
      onChange({
        id: opt.id,
        label: opt.label,
        startDate: opt.payload.start,
        endDate: opt.payload.end,
      });
    }
  };

  const handleCustomApply = (e) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;
    setIsCustomMode(false);
    setIsOpen(false);
    if (onChange) {
      const [sY, sM, sD] = customStart.split('-').map(Number);
      const [eY, eM, eD] = customEnd.split('-').map(Number);
      onChange({
        id: 'custom',
        label: 'Custom Range',
        startDate: new Date(sY, sM - 1, sD, 0, 0, 0, 0).toISOString(),
        endDate: new Date(eY, eM - 1, eD, 23, 59, 59, 999).toISOString(),
      });
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button Matching Image 2 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="btn-secondary text-xs sm:text-sm"
      >
        <Calendar className="w-4 h-4 text-amber-400" />
        <span className="text-zinc-100">{currentLabel}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-zinc-400 ml-0.5" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-400 ml-0.5" />
        )}
      </button>

      {/* Dropdown Menu Matching Image 2 */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 card p-2 z-50 shadow-2xl animate-fade-in-up" role="menu">
          {!isCustomMode ? (
            <div className="space-y-1">
              {options.map((opt) => {
                const isSelected = currentSelection === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 text-amber-300 font-semibold ring-1 ring-amber-500/30'
                        : 'text-zinc-300 hover:text-white hover:bg-surface-raised font-medium'
                    }`}
                  >
                    <span className="text-xs sm:text-sm">{opt.label}</span>
                    {opt.dates ? (
                      <span
                        className={`text-[11px] font-mono tracking-tight ${
                          isSelected ? 'text-amber-400/80' : 'text-zinc-500'
                        }`}
                      >
                        {opt.dates}
                      </span>
                    ) : (
                      <Calendar className="w-4 h-4 text-zinc-500" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Custom Date Picker */
            <form onSubmit={handleCustomApply} className="p-2 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Custom Date Range
                </span>
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  className="text-[11px] text-zinc-400 hover:text-white"
                >
                  Back
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">From Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  required
                  className="input py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">To Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  required
                  className="input py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-400 text-xs hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customStart || !customEnd}
                  className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold disabled:opacity-40"
                >
                  Apply
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default DateRangeSelector;
