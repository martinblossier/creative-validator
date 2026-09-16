import { listSessions } from './sessions';
import { getAllClientMeta, type Frequency } from './client-meta';
import { getAgendaOverrides } from './agenda-overrides';

export type AgendaEntry = {
  clientName: string;
  frequency: Frequency;
  date: string; // effective date (YYYY-MM-DD), override applied if present
  originalDate: string;
  isOverridden: boolean;
  isUpcoming: boolean; // due within the next 10 days
};

function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Adds N months to a date, clamping to the last day of the target month. */
function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target;
}

function step(date: Date, frequency: Frequency, direction: 1 | -1): Date {
  if (frequency === 'weekly') {
    return new Date(date.getTime() + direction * 7 * 86400000);
  }
  const months = frequency === 'monthly' ? 1 : frequency === 'bimonthly' ? 2 : 3;
  return addMonthsClamped(date, direction * months);
}

/** Projects every occurrence of a recurring cadence that falls within [rangeStart, rangeEnd]. */
function generateOccurrences(
  referenceDate: Date,
  frequency: Frequency,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const occurrences: Date[] = [];

  let cursor = new Date(referenceDate);
  let guard = 0;
  while (cursor.getTime() > rangeStart.getTime() && guard < 1000) {
    cursor = step(cursor, frequency, -1);
    guard += 1;
  }

  guard = 0;
  while (cursor.getTime() <= rangeEnd.getTime() && guard < 1000) {
    if (cursor.getTime() >= rangeStart.getTime()) {
      occurrences.push(new Date(cursor));
    }
    cursor = step(cursor, frequency, 1);
    guard += 1;
  }

  return occurrences;
}

async function computeEntriesForRange(rangeStart: Date, rangeEnd: Date): Promise<AgendaEntry[]> {
  const sessions = await listSessions();
  const clientNames = Array.from(new Set(sessions.map((s) => s.clientName)));
  const metaByClient = await getAllClientMeta(clientNames);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tenDaysOut = new Date(today.getTime() + 10 * 86400000);

  const entries: AgendaEntry[] = [];

  for (const clientName of clientNames) {
    const meta = metaByClient[clientName];
    if (!meta || meta.recurrence !== 'recurrent' || !meta.frequency || !meta.referenceDate) {
      continue;
    }

    const referenceDate = parseISODate(meta.referenceDate);
    const occurrences = generateOccurrences(referenceDate, meta.frequency, rangeStart, rangeEnd);
    const overrides = await getAgendaOverrides(clientName);

    for (const occ of occurrences) {
      const originalDate = toISODate(occ);
      const overrideDate = overrides[originalDate];
      const effectiveDate = overrideDate ?? originalDate;
      const effective = parseISODate(effectiveDate);

      entries.push({
        clientName,
        frequency: meta.frequency,
        date: effectiveDate,
        originalDate,
        isOverridden: Boolean(overrideDate),
        isUpcoming: effective.getTime() >= today.getTime() && effective.getTime() <= tenDaysOut.getTime(),
      });
    }
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));
  return entries;
}

export async function getAgendaEntriesForYear(year: number): Promise<AgendaEntry[]> {
  const rangeStart = new Date(year, 0, 1);
  const rangeEnd = new Date(year, 11, 31);
  return computeEntriesForRange(rangeStart, rangeEnd);
}

/** Entries whose effective date is exactly N days from today — used by the daily reminder cron. */
export async function getEntriesDueInDays(days: number): Promise<AgendaEntry[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(today.getTime() + days * 86400000);

  const entries = await computeEntriesForRange(today, new Date(target.getTime() + 86400000));
  const targetIso = toISODate(target);
  return entries.filter((e) => e.date === targetIso);
}
