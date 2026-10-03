import races from './races-2026.json' with { type: 'json' };

// IDs identify existing spreadsheet blocks. Never renumber them when the calendar changes.
export const RACES = races;
export const CALENDAR_VERSION = '2026-10-03-sheet-31';
export const TIME_ZONE = 'Europe/Rome';
const SEVEN_HOURS_MS = 7 * 60 * 60 * 1000;

export function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

export function resolveSeasonRace(race, seasonRaces) {
  const matches = seasonRaces.filter((entry) =>
    entry.season === '2026' && entry.Circuit?.circuitId === race.circuitId
  );
  if (matches.length !== 1) {
    throw new Error(`Calendario Jolpi mancante o ambiguo per ${race.name}`);
  }
  const match = matches[0];
  if (race.isSprint && !match.Sprint) {
    throw new Error(`Sessione Sprint mancante per ${race.name}`);
  }
  return match;
}

export function getRaceTiming(race, schedule, now = new Date()) {
  const qualifyingStartsAt = parseDate(schedule?.qualifying?.dateStart || race.qualifyingStartsAt);
  const raceStartsAt = parseDate(schedule?.raceSession?.dateStart || race.raceStartsAt);
  // Existing game rule: estimated qualifying duration (1h) + 6h, capped at race start.
  const lockStartsAt = qualifyingStartsAt && raceStartsAt
    ? new Date(Math.min(qualifyingStartsAt.getTime() + SEVEN_HOURS_MS, raceStartsAt.getTime()))
    : null;
  const italianDay = (date) => new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
  const done = race.isCancelled || Boolean(raceStartsAt && italianDay(now) > italianDay(raceStartsAt));
  return {
    qualifyingStartsAt,
    raceStartsAt,
    lockStartsAt,
    done,
    isOpen: Boolean(!race.isCancelled && lockStartsAt && now < lockStartsAt),
    isLocked: Boolean(!race.isCancelled && lockStartsAt && raceStartsAt && now >= lockStartsAt && now < raceStartsAt),
    isOngoing: Boolean(!race.isCancelled && raceStartsAt && now >= raceStartsAt && !done)
  };
}
