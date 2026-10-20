// The Core Time panel's wording, as the extension's
// src/components/CoreTimePanel.tsx renders it, turned into data so the demo
// can draw it on the server and live. Keep it in step with renderConclusion()
// there; the helpers below are its own, verbatim.

import type { CoreTimeNextOverlap, CoreTimeOverlapRange, CoreTimeResult } from './extension/coretime';
import { referenceRoleOf, resolveReferenceChip, type ReferenceRole } from './extension/model';
import { sameZone } from './extension/tz';
import type { AppSettings, Entry } from './extension/types';

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatSlotTime(axis: { slot: number; refTime: string }[], slot: number): string {
  return slot >= axis.length ? '24:00' : axis[slot].refTime;
}

function formatRanges(axis: { slot: number; refTime: string }[], ranges: CoreTimeOverlapRange[]): string {
  return ranges
    .map((range) => `${formatSlotTime(axis, range.startSlot)}–${formatSlotTime(axis, range.endSlot)}`)
    .join(', ');
}

function formatHoursDiff(minutes: number): string {
  if (minutes % 30 === 0) {
    const hours = minutes / 60;
    return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
  }
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? '';
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

// One line of the conclusion. A headline may end in a range, set apart in
// blue; a muted line may be the PARTIAL_OVERLAP hint, which toggles a city.
export type ConclusionLine =
  | { kind: 'headline'; text: string; range?: string }
  | { kind: 'detail'; text: string }
  | { kind: 'muted'; text: string; toggles?: string };

export interface CoreTimeView {
  // "today · 3 cities", "today · 2 of 3 cities"
  countText: string;
  canExpand: boolean;
  lines: ConclusionLine[];
  roleOf: (entryId: string) => ReferenceRole;
  labelOf: (entryId: string) => string;
}

export function coreTimeView(
  result: CoreTimeResult,
  entries: Entry[],
  settings: AppSettings,
  systemTimezone: string,
  expanded: boolean
): CoreTimeView {
  const referenceTimezone = settings.referenceTimezone ?? systemTimezone;
  const includedCount = result.rows.filter((row) => row.included).length;
  const entryOf = (entryId: string) => entries.find((entry) => entry.id === entryId);
  const labelOf = (entryId: string) => entryOf(entryId)?.label ?? '';
  const chip = resolveReferenceChip(entries, settings, systemTimezone);
  const roleOf = (entryId: string): ReferenceRole => {
    const entry = entryOf(entryId);
    return entry ? referenceRoleOf(entry, chip, referenceTimezone) : null;
  };
  const isYou = (entryId: string) => roleOf(entryId) === 'you';

  const nextOverlapLine = (label: string, nextOverlap: CoreTimeNextOverlap | null): ConclusionLine[] => {
    if (!nextOverlap) return [];
    const range = `${formatSlotTime(result.axis, nextOverlap.startSlot)}–${formatSlotTime(result.axis, nextOverlap.endSlot)}`;
    const { excludedId } = nextOverlap;
    const but = excludedId ? ` (all but ${isYou(excludedId) ? 'you' : labelOf(excludedId)})` : '';
    return [{ kind: 'detail', text: `${label} — ${WEEKDAY_SHORT[nextOverlap.weekday]} ${range}${but}` }];
  };

  const lines = ((): ConclusionLine[] => {
    const { conclusion } = result;
    switch (conclusion.status) {
      case 'NO_ENTRIES':
        if (entries.length > 0 && includedCount === 0) {
          return [
            { kind: 'headline', text: 'No cities in core time' },
            { kind: 'muted', text: expanded ? 'Tap a city to include it' : 'Expand to include a city' },
          ];
        }
        return [{ kind: 'headline', text: 'Add a city to compare' }];

      case 'OVERLAP': {
        const onlyIncluded = includedCount === 1 ? result.rows.find((row) => row.included) : undefined;
        const prefix = onlyIncluded ? labelOf(onlyIncluded.entryId) : 'Overlap';
        return [{ kind: 'headline', text: prefix, range: formatRanges(result.axis, result.overlap) }];
      }

      case 'NO_OVERLAP_TODAY': {
        const { closest } = conclusion;
        const gap = formatHoursDiff(closest.gapMinutes);
        let directionText: string | null = null;
        if (closest.bottleneckEntryIds.length > 1) {
          directionText = `${closest.bottleneckEntryIds.length} cities are ${gap} outside their work hours`;
        } else {
          const [bottleneckId] = closest.bottleneckEntryIds;
          const bottleneck = closest.perEntry.find((p) => p.entryId === bottleneckId);
          const whose = sameZone(entryOf(bottleneckId)?.timezone ?? '', referenceTimezone)
            ? 'your'
            : `${labelOf(bottleneckId)}'s`;
          if (bottleneck?.direction === 'BEFORE_START') directionText = `${gap} before ${whose} day starts`;
          else if (bottleneck?.direction === 'AFTER_END') directionText = `${gap} after ${whose} day ends`;
        }
        return [
          { kind: 'headline', text: 'No overlap today' },
          { kind: 'detail', text: `Closest — ${closest.refTime} yours` },
          ...(directionText ? [{ kind: 'muted' as const, text: directionText }] : []),
        ];
      }

      case 'PARTIAL_OVERLAP': {
        const excludedIsYou = isYou(conclusion.excludedId);
        const excludedLabel = labelOf(conclusion.excludedId);
        return [
          {
            kind: 'headline',
            text: `All but ${excludedIsYou ? 'you' : excludedLabel} overlap`,
            range: formatRanges(result.axis, conclusion.overlap),
          },
          {
            kind: 'muted',
            text: excludedIsYou
              ? "Your hours don't overlap — tap to exclude yourself"
              : `${excludedLabel} is outside its work hours — tap to exclude it`,
            toggles: conclusion.excludedId,
          },
        ];
      }

      case 'ALL_OFF':
        return [
          { kind: 'headline', text: "Everyone's off today" },
          ...nextOverlapLine('Next overlap', conclusion.nextOverlap),
        ];

      case 'PARTIAL_OFF': {
        const workingLabels = conclusion.workingEntryIds.map(labelOf);
        const workingCount = workingLabels.length;
        const verb = workingCount === 1 ? 'is' : 'are';
        const who = workingCount >= 3 ? `${workingCount} cities` : joinLabels(workingLabels);
        return [
          { kind: 'headline', text: `Only ${who} ${verb} working today` },
          ...(conclusion.workingOverlap.length > 0
            ? [
                {
                  kind: 'detail' as const,
                  text: `${workingCount >= 3 ? `Those ${workingCount}` : 'They'} overlap ${formatRanges(result.axis, conclusion.workingOverlap)}`,
                },
              ]
            : []),
          ...nextOverlapLine('Next full overlap', conclusion.nextOverlap),
        ];
      }
    }
  })();

  const cityWord = entries.length === 1 ? 'city' : 'cities';
  const countText =
    includedCount === entries.length
      ? `today · ${entries.length} ${cityWord}`
      : `today · ${includedCount} of ${entries.length} ${cityWord}`;

  return { countText, canExpand: entries.length > 0, lines, roleOf, labelOf };
}
