/** Business clock for DNC / BLA reporting. */
export const APP_TZ = 'America/New_York';
export const APP_TZ_LABEL = 'US Eastern';

function pad(n) {
  return String(n).padStart(2, '0');
}

export function formatYmd({ year, month, day }) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function getZonedParts(date = new Date(), timeZone = APP_TZ) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const hour = map.hour === '24' ? 0 : Number(map.hour);
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function offsetMs(date, timeZone) {
  const z = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second);
  return asUtc - date.getTime();
}

/** Wall-clock time in APP_TZ → UTC Date */
export function zonedTimeToUtc(year, month, day, hour = 0, minute = 0, second = 0, ms = 0, timeZone = APP_TZ) {
  const naive = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const first = new Date(naive);
  const adjusted = new Date(naive - offsetMs(first, timeZone));
  return new Date(naive - offsetMs(adjusted, timeZone));
}

export function addCalendarDays({ year, month, day }, delta) {
  const d = new Date(Date.UTC(year, month - 1, day + delta));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Monday = 1 … Sunday = 7 in APP_TZ */
export function zonedMondayBasedWeekday(date = new Date(), timeZone = APP_TZ) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
  return { Sun: 7, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[name] || 1;
}

export function startOfZonedDay(parts, timeZone = APP_TZ) {
  return zonedTimeToUtc(parts.year, parts.month, parts.day, 0, 0, 0, 0, timeZone);
}

export function endOfZonedDay(parts, timeZone = APP_TZ) {
  return zonedTimeToUtc(parts.year, parts.month, parts.day, 23, 59, 59, 999, timeZone);
}

export function rangeFromYmd(start, end) {
  return {
    start: startOfZonedDay(start).toISOString(),
    end: endOfZonedDay(end).toISOString(),
    dateString: formatYmd(start) === formatYmd(end) ? formatYmd(start) : `${formatYmd(start)} – ${formatYmd(end)}`,
  };
}

/** Preset filters computed in US Eastern, not the browser's local clock. */
export function getPresetRanges(now = new Date()) {
  const today = getZonedParts(now);
  const yesterday = addCalendarDays(today, -1);
  const dow = zonedMondayBasedWeekday(now);
  const monday = addCalendarDays(today, -(dow - 1));
  const sunday = addCalendarDays(monday, 6);
  const lastMonday = addCalendarDays(monday, -7);
  const lastSunday = addCalendarDays(sunday, -7);
  const thisMonthStart = { year: today.year, month: today.month, day: 1 };
  const nextMonthStart =
    today.month === 12 ? { year: today.year + 1, month: 1, day: 1 } : { year: today.year, month: today.month + 1, day: 1 };
  const thisMonthEnd = addCalendarDays(nextMonthStart, -1);
  const lastMonthEnd = addCalendarDays(thisMonthStart, -1);
  const lastMonthStart = { year: lastMonthEnd.year, month: lastMonthEnd.month, day: 1 };

  return {
    today: { label: 'Today', ...rangeFromYmd(today, today) },
    yesterday: { label: 'Yesterday', ...rangeFromYmd(yesterday, yesterday) },
    this_week: { label: 'This Week', ...rangeFromYmd(monday, sunday) },
    last_week: { label: 'Last Week', ...rangeFromYmd(lastMonday, lastSunday) },
    this_month: { label: 'This Month', ...rangeFromYmd(thisMonthStart, thisMonthEnd) },
    last_month: { label: 'Last Month', ...rangeFromYmd(lastMonthStart, lastMonthEnd) },
  };
}

export function thisWeekRange(now = new Date()) {
  const preset = getPresetRanges(now).this_week;
  return {
    id: 'this_week',
    label: 'This Week',
    startDate: preset.start,
    endDate: preset.end,
  };
}
