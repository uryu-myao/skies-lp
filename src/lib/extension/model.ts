// From the extension's src/core/model.ts, verbatim: the default settings, the
// header chip and Core Time's YOU / BASE roles, and the two work-hour
// helpers coretime.ts needs. The rest of model.ts is storage and list logic
// the site has no use for.
import { friendlyZoneName, sameZone } from './tz';
import type { AppSettings, Entry, WorkDays, WorkHours } from './types';

export const DEFAULT_SETTINGS: AppSettings = {
  hour24: true,
  showSeconds: false,
  sortOrder: 'manual',
  referenceTimezone: null,
  referenceEntryId: null,
  defaultWorkHours: { start: 9, end: 18 },
  defaultWorkDays: [1, 2, 3, 4, 5],
  coreTimePanel: 'always',
  dstBannerEnabled: true,
  dstLeadDays: 14,
  dstNotificationEnabled: false,
};

export type ReferenceSelection =
  | { kind: 'system' }
  | { kind: 'entry'; entryId: string }
  // A zone is set but no entry in the list carries it any more.
  | { kind: 'none' };

export interface ReferenceChip {
  label: string;
  selection: ReferenceSelection;
  // The list entry that stands for the user — the Core Time band's YOU. Not
  // always the selection: under System nothing is selected, yet the user
  // still has a city in the list (spec §9.1, §9.3). Null when no entry fits.
  youEntryId: string | null;
}

// Identity — "which one is me" — decided once, for the header chip and the
// Core Time band alike, so the two can't disagree (spec §9.1). Base / BASE
// are relation and follow the zone instead (referenceRoleOf below).
//
// - System (referenceTimezone null): the chip reads the system zone's own
//   name, never a list entry's label, even one in the same zone — or picking
//   System next to a same-zone "Tsu" would still read "Tsu" and look ignored.
//   YOU is still the first entry in the system zone, if there is one:
//   System is the default, and without it most users would never see YOU.
// - A picked entry: its label, found by referenceEntryId; it's also YOU.
// - That entry gone (removed), or data from before referenceEntryId: the
//   first entry left in the zone, then the zone's own name and no YOU.
export function resolveReferenceChip(
  entries: Entry[],
  settings: AppSettings,
  systemTimezone: string
): ReferenceChip {
  // Same zone, whatever it's called: Chrome reports India's zone as
  // Asia/Calcutta, a Kolkata entry says Asia/Kolkata (spec §4.2).
  const firstIn = (zone: string) => entries.find((entry) => sameZone(entry.timezone, zone));

  const zone = settings.referenceTimezone;
  if (zone === null) {
    return {
      label: friendlyZoneName(systemTimezone),
      selection: { kind: 'system' },
      youEntryId: firstIn(systemTimezone)?.id ?? null,
    };
  }

  const picked = entries.find(
    (entry) => entry.id === settings.referenceEntryId && sameZone(entry.timezone, zone)
  );
  const entry = picked ?? firstIn(zone);
  if (!entry) {
    return { label: friendlyZoneName(zone), selection: { kind: 'none' }, youEntryId: null };
  }
  return { label: entry.label, selection: { kind: 'entry', entryId: entry.id }, youEntryId: entry.id };
}

export type ReferenceRole = 'you' | 'base' | null;

export function referenceRoleOf(
  entry: Entry,
  chip: ReferenceChip,
  referenceTimezone: string
): ReferenceRole {
  if (chip.youEntryId === entry.id) return 'you';
  return sameZone(entry.timezone, referenceTimezone) ? 'base' : null;
}

export interface ResolvedWorkHours extends WorkHours {
  isDefault: boolean;
}

export interface ResolvedWorkDays {
  days: WorkDays;
  isDefault: boolean;
}

// The only sanctioned way to read an entry's working hours — never read
// entry.workHours directly, null means "inherit global default", not "no hours".
export function resolveWorkHours(entry: Entry, settings: AppSettings): ResolvedWorkHours {
  if (entry.workHours === null) {
    return { ...settings.defaultWorkHours, isDefault: true };
  }
  return { ...entry.workHours, isDefault: false };
}

// The only sanctioned way to read an entry's working days — see resolveWorkHours.
export function resolveWorkDays(entry: Entry, settings: AppSettings): ResolvedWorkDays {
  if (entry.workDays === null) {
    return { days: settings.defaultWorkDays, isDefault: true };
  }
  return { days: entry.workDays, isDefault: false };
}

