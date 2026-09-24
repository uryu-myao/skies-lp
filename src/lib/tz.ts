// A trimmed port of the extension's src/core/tz.ts, so the demo popup on the
// page reads exactly like the real one. Keep the formatting rules in sync.

export type Sky = 'night' | 'dawn' | 'day' | 'twilight';

export interface City {
  city: string;
  zone: string;
}

export interface CardView extends City {
  time: string;
  relative: string;
  utc: string;
  dayLabel: string;
  week: string;
  date: string;
  month: string;
  sky: Sky;
}

const MINUS_SIGN = '−';
// Without live sunrise/sunset data the extension falls back to 06:00 / 18:00,
// with a 45-minute dawn and twilight window either side.
const SUNRISE = 360;
const SUNSET = 1080;
const TWILIGHT_MINUTES = 45;

function parts(zone: string, date: Date, options: Intl.DateTimeFormatOptions) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: zone, ...options })
      .formatToParts(date)
      .map((p) => [p.type, p.value])
  ) as Record<string, string>;
}

export function offsetMinutes(zone: string, date: Date): number {
  const p = parts(zone, date, {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return (asUTC - Math.floor(date.getTime() / 1000) * 1000) / 60000;
}

function splitSignedMinutes(minutes: number) {
  const abs = Math.abs(minutes);
  return { sign: minutes < 0 ? MINUS_SIGN : '+', hours: Math.floor(abs / 60), mins: abs % 60 };
}

// "+3h", "−13h", "+3:30h" — minutes spelled out, never decimal hours.
export function formatRelativeOffset(minutes: number): string {
  if (minutes === 0) return '0h';
  const { sign, hours, mins } = splitSignedMinutes(minutes);
  return `${sign}${hours}${mins ? `:${String(mins).padStart(2, '0')}` : ''}h`;
}

// "UTC+09", "UTC−04", "UTC+05:45"; plain "UTC" at zero.
export function formatUtcOffset(minutes: number): string {
  if (minutes === 0) return 'UTC';
  const { sign, hours, mins } = splitSignedMinutes(minutes);
  return `UTC${sign}${String(hours).padStart(2, '0')}${mins ? `:${String(mins).padStart(2, '0')}` : ''}`;
}

function dateKey(zone: string, date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(date);
}

function dayDelta(zone: string, reference: string, date: Date): number {
  const a = Date.parse(dateKey(zone, date));
  const b = Date.parse(dateKey(reference, date));
  return Math.round((a - b) / 86400000);
}

function dayDeltaLabel(delta: number): string {
  if (delta === 0) return '';
  if (delta === -1) return 'yesterday';
  if (delta === 1) return 'tomorrow';
  return `${Math.abs(delta)} days ${delta < 0 ? 'back' : 'ahead'}`;
}

export function skyAt(minutesOfDay: number): Sky {
  if (minutesOfDay >= SUNRISE + TWILIGHT_MINUTES && minutesOfDay <= SUNSET - TWILIGHT_MINUTES) return 'day';
  if (Math.abs(minutesOfDay - SUNRISE) <= TWILIGHT_MINUTES) return 'dawn';
  if (Math.abs(minutesOfDay - SUNSET) <= TWILIGHT_MINUTES) return 'twilight';
  return 'night';
}

export function cardView(city: City, reference: string, date: Date): CardView {
  const p = parts(city.zone, date, {
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const relative = offsetMinutes(city.zone, date) - offsetMinutes(reference, date);
  return {
    ...city,
    time: `${p.hour}:${p.minute}`,
    relative: city.zone === reference ? 'Base' : formatRelativeOffset(relative),
    utc: formatUtcOffset(offsetMinutes(city.zone, date)),
    dayLabel: dayDeltaLabel(dayDelta(city.zone, reference, date)),
    week: p.weekday.toLowerCase(),
    date: p.day,
    month: p.month.toLowerCase(),
    sky: skyAt(+p.hour * 60 + +p.minute),
  };
}

// A deterministic star field per city, like the extension's night cards.
export function makeStars(seed: string, count = 20) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (Math.imul(31, s) + seed.charCodeAt(i)) | 0;
  const rand = () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 0x100000000;
  };
  return Array.from({ length: count }, () => ({
    cx: rand() * 372 + 4,
    cy: rand() * 74 + 4,
    r: rand() * 0.5 + 0.5,
    o: rand() * 0.4 + 0.55,
  }));
}
