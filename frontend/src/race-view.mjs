import { RACES, getRaceTiming } from '../../shared/calendar.mjs';

export const PLAYERS = ['Andrea', 'Giovanni', 'Luca', 'Marco', 'Michele', 'Salvo'];
export const POSITIONS = [['pole', 'Pole position'], ['first', '1° posto'], ['second', '2° posto'], ['third', '3° posto']];
export const EMPTY_PREDICTIONS = { pole: '', first: '', second: '', third: '' };
// A race leaves "In corso" once it is surely over (red flags included), not at Italian midnight.
const RACE_OVER_MS = 3 * 60 * 60 * 1000;

export function buildRaces(schedules, summaries, now) {
  return RACES.filter((race) => !race.isCancelled).map((race) => {
    const timing = getRaceTiming(race, schedules[race.id], now);
    const finished = timing.done || Boolean(timing.raceStartsAt && now - timing.raceStartsAt >= RACE_OVER_MS);
    return {
      ...race,
      ...timing,
      finished,
      isOngoing: timing.isOngoing && !finished,
      points: summaries?.find((entry) => entry.id === race.id)?.points || {},
    };
  }).sort((a, b) => a.raceStartsAt - b.raceStartsAt);
}

export function filterRaces(races, filter) {
  const filtered = races.filter((race) => filter === 'past' ? race.finished
    : filter === 'ongoing' ? race.isLocked || race.isOngoing
      : !race.finished && !race.isLocked && !race.isOngoing);
  return filter === 'past' ? filtered.sort((a, b) => b.raceStartsAt - a.raceStartsAt) : filtered;
}

export function editableWeekend(races) {
  const next = races.find((race) => race.isOpen && !race.done);
  return next ? races.filter((race) => race.isOpen && !race.done &&
    race.lockStartsAt - next.lockStartsAt >= 0 && race.lockStartsAt - next.lockStartsAt <= 4 * 86400000) : [];
}

export function rankPlayers(standings = []) {
  let previous = null;
  let rank = 0;
  return [...standings].sort((a, b) => Number(b.pointsTotal) - Number(a.pointsTotal) || a.name.localeCompare(b.name, 'it'))
    .map((player) => {
      const points = Number(player.pointsTotal || 0);
      if (points !== previous) rank++;
      previous = points;
      return { ...player, pointsTotal: points, rank };
    });
}

export function normalizePredictions(values = {}, drivers = []) {
  const normalize = (value) => String(value || '').trim().toLowerCase();
  return Object.fromEntries(POSITIONS.map(([position]) => {
    const raw = values[position] || '';
    const match = drivers.find((driver) => [driver.id, driver.name, driver.name.split(' ').pop()]
      .some((value) => normalize(value) === normalize(raw)));
    return [position, match?.id || raw];
  }));
}

export const samePredictions = (a, b) => POSITIONS.every(([key]) => a[key] === b[key]);
export const duplicatePodium = (value) => {
  const podium = [value.first, value.second, value.third].filter(Boolean);
  return new Set(podium).size !== podium.length;
};

export function formatDate(value, options = {}) {
  if (!value) return 'Orario da confermare';
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', timeZone: 'Europe/Rome', ...options }).format(new Date(value));
}

export function raceStatus(race, isEditable) {
  if (race.finished) return { label: 'Conclusa', tone: 'muted' };
  if (race.isOngoing) return { label: 'Gara di oggi', tone: 'red' };
  if (race.isLocked) return { label: 'Pronostici chiusi', tone: 'amber' };
  if (isEditable) return { label: 'Pronostici aperti', tone: 'green' };
  return { label: 'In programma', tone: 'muted' };
}
