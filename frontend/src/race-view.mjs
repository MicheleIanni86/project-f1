import { RACES, getRaceTiming } from '../../shared/calendar.mjs';

export const PLAYERS = ['Andrea', 'Giovanni', 'Luca', 'Marco', 'Michele', 'Salvo'];
export const POSITIONS = [['pole', 'Pole position'], ['first', '1° posto'], ['second', '2° posto'], ['third', '3° posto']];
export const EMPTY_PREDICTIONS = { pole: '', first: '', second: '', third: '' };

export function buildRaces(schedules, summaries, now) {
  return RACES.filter((race) => !race.isCancelled).map((race) => ({
    ...race,
    ...getRaceTiming(race, schedules[race.id], now),
    points: summaries?.find((entry) => entry.id === race.id)?.points || {},
  })).sort((a, b) => a.raceStartsAt - b.raceStartsAt);
}

export function filterRaces(races, filter) {
  const filtered = races.filter((race) => filter === 'past' ? race.done
    : filter === 'ongoing' ? race.isLocked || race.isOngoing
      : !race.done && !race.isLocked && !race.isOngoing);
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
  if (race.done) return { label: 'Conclusa', tone: 'muted' };
  if (race.isOngoing) return { label: 'Gara di oggi', tone: 'red' };
  if (race.isLocked) return { label: 'Pronostici chiusi', tone: 'amber' };
  if (isEditable) return { label: 'Pronostici aperti', tone: 'green' };
  return { label: 'In programma', tone: 'muted' };
}
