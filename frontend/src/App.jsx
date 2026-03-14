import React, { useEffect, useRef, useState } from 'react';
import { Trophy, ChevronRight, User, Calendar, Flame, Timer, CheckCircle2, Eye, Lock, LogOut, Menu, X, FileSpreadsheet } from 'lucide-react';
import clsx from 'clsx';

import { DRIVERS } from './drivers';

const PLAYERS = ['Andrea', 'Giovanni', 'Luca', 'Marco', 'Michele', 'Salvo'];

const DEFAULT_RACES = [
  { id: 1, name: 'AUSTRALIA', date: '07 MAR', time: '06:00', isSprint: false },
  { id: 2, name: 'CINA SPRINT', date: '13 MAR', time: '08:30', isSprint: true },
  { id: 3, name: 'CINA', date: '14 MAR', time: '08:00', isSprint: false },
  { id: 4, name: 'GIAPPONE', date: '28 MAR', time: '07:00', isSprint: false },
  { id: 5, name: 'BAHRAIN', date: '11 APR', time: '18:00', isSprint: false },
  { id: 6, name: 'ARABIA SAUDITA', date: '18 APR', time: '19:00', isSprint: false },
  { id: 7, name: 'MIAMI SPRINT', date: '01 MAG', time: '22:30', isSprint: true },
  { id: 8, name: 'MIAMI', date: '02 MAG', time: '22:00', isSprint: false },
  { id: 9, name: 'CANADA SPRINT', date: '22 MAG', time: '22:30', isSprint: true },
  { id: 10, name: 'CANADA', date: '23 MAG', time: '22:00', isSprint: false },
  { id: 11, name: 'MONACO', date: '06 GIU', time: '16:00', isSprint: false },
  { id: 12, name: 'CATALUNYA', date: '13 GIU', time: '16:00', isSprint: false },
  { id: 13, name: 'AUSTRIA', date: '27 GIU', time: '16:00', isSprint: false },
  { id: 14, name: 'UK SPRINT', date: '03 LUG', time: '17:30', isSprint: true },
  { id: 15, name: 'UK', date: '04 LUG', time: '17:00', isSprint: false },
  { id: 16, name: 'BELGIO', date: '18 LUG', time: '16:00', isSprint: false },
  { id: 17, name: 'UNGHERIA', date: '25 LUG', time: '16:00', isSprint: false },
  { id: 18, name: 'OLANDA SPRINT', date: '21 AGO', time: '16:30', isSprint: true },
  { id: 19, name: 'OLANDA', date: '22 AGO', time: '16:00', isSprint: false },
  { id: 20, name: 'ITALIA', date: '05 SET', time: '16:00', isSprint: false },
  { id: 21, name: 'SPAGNA', date: '12 SET', time: '16:00', isSprint: false },
  { id: 22, name: 'AZERBAIJAN', date: '25 SET', time: '14:00', isSprint: false },
  { id: 23, name: 'SINGAPORE SPRINT', date: '09 OTT', time: '14:30', isSprint: true },
  { id: 24, name: 'SINGAPORE', date: '10 OTT', time: '15:00', isSprint: false },
  { id: 25, name: 'USA', date: '24 OTT', time: '23:00', isSprint: false },
  { id: 26, name: 'MESSICO', date: '31 OTT', time: '22:00', isSprint: false },
  { id: 27, name: 'BRASILE', date: '07 NOV', time: '19:00', isSprint: false },
  { id: 28, name: 'LAS VEGAS', date: '21 NOV', time: '05:00', isSprint: false },
  { id: 29, name: 'QATAR', date: '28 NOV', time: '19:00', isSprint: false },
  { id: 30, name: 'ABU DHABI', date: '05 DIC', time: '15:00', isSprint: false }
];

const MONTH_MAP = {
  GEN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAG: 4,
  GIU: 5,
  LUG: 6,
  AGO: 7,
  SET: 8,
  OTT: 9,
  NOV: 10,
  DIC: 11
};

const DEFAULT_API_BASE = 'https://fanta-f1-backend.michelepizzica.workers.dev';
const API_BASES = Array.from(
  new Set([import.meta.env.VITE_API_BASE_URL, DEFAULT_API_BASE].filter(Boolean))
);
const EMPTY_PREDICTIONS = { pole: '', first: '', second: '', third: '' };
const SHARED_SHEET_URL = import.meta.env.VITE_SHARED_SHEET_URL || 'https://docs.google.com/spreadsheets/d/1wMlfyrE5eZKV18N6a5Dh-qH9ls0Nuhtdt-gBXHajPVs/edit?gid=0';
const SHARED_SHEET_ID = '1wMlfyrE5eZKV18N6a5Dh-qH9ls0Nuhtdt-gBXHajPVs';
const STORAGE_KEYS = {
  currentUser: 'f1nta-current-user'
};
const RACE_WEEKEND_HOURS = 48;

function normalizePredictionSet(value) {
  return {
    pole: value?.pole || '',
    first: value?.first || '',
    second: value?.second || '',
    third: value?.third || ''
  };
}

function predictionsAreEqual(a, b) {
  const left = normalizePredictionSet(a);
  const right = normalizePredictionSet(b);
  return left.pole === right.pole
    && left.first === right.first
    && left.second === right.second
    && left.third === right.third;
}

function isPodiumPosition(position) {
  return position === 'first' || position === 'second' || position === 'third';
}

function hasDuplicatePodiumPredictions(predictions) {
  const values = [predictions.first, predictions.second, predictions.third].filter(Boolean);
  return new Set(values).size !== values.length;
}

function toRaceDate(race) {
  const [day, month] = race.date.split(' ');
  const monthIndex = MONTH_MAP[month];
  if (monthIndex === undefined) return null;
  const [hours, minutes] = race.time.split(':').map(Number);
  return new Date(2026, monthIndex, Number(day), hours, minutes);
}

function endOfRaceDay(date) {
  if (!date) return null;
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function normalizeRace(race) {
  const deadline = toRaceDate(race);
  const weekendStartsAt = deadline ? new Date(deadline.getTime() - RACE_WEEKEND_HOURS * 60 * 60 * 1000) : null;
  const raceDayEndsAt = endOfRaceDay(deadline);
  const now = new Date();
  return {
    ...race,
    deadline,
    weekendStartsAt,
    raceDayEndsAt,
    done: raceDayEndsAt ? raceDayEndsAt < now : false,
    isOpen: deadline ? now < deadline : false,
    isOngoing: raceDayEndsAt && weekendStartsAt ? now >= weekendStartsAt && now <= raceDayEndsAt : false
  };
}

function buildStandingsWithRank(standings) {
  let previousPoints = null;
  let currentRank = 0;

  return standings.map((player, index) => {
    const points = Number(player.pointsTotal || 0);
    if (previousPoints !== points) {
      currentRank += 1;
    }
    previousPoints = points;

    return {
      ...player,
      rank: currentRank
    };
  });
}

function groupStandingsByRank(standings) {
  return standings.reduce((groups, player) => {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.rank === player.rank && lastGroup.pointsTotal === player.pointsTotal) {
      lastGroup.players.push(player);
      return groups;
    }

    groups.push({
      rank: player.rank,
      pointsTotal: player.pointsTotal,
      players: [player]
    });
    return groups;
  }, []);
}

function formatSessionDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;

  const day = new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Europe/Rome'
  }).format(date);

  const time = new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Rome'
  }).format(date);

  return `${day} • ${time}`;
}

function formatWeekendDayBadge(qualifyingDate, raceDate, fallbackDate) {
  const toDay = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return null;
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      timeZone: 'Europe/Rome'
    }).format(date);
  };

  const qualifyingDay = toDay(qualifyingDate);
  const raceDay = toDay(raceDate);

  if (qualifyingDay && raceDay) {
    return qualifyingDay === raceDay ? qualifyingDay : `${qualifyingDay}/${raceDay}`;
  }

  if (raceDay) return raceDay;
  return fallbackDate.split(' ')[0];
}

function playerInitial(name) {
  return name?.[0]?.toUpperCase() || '?';
}

function formatPrediction(value) {
  return value || '—';
}

async function apiFetchJson(path, options) {
  let lastError = null;

  for (const base of API_BASES) {
    const normalizedBase = base.replace(/\/+$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    try {
      const response = await fetch(`${normalizedBase}${normalizedPath}`, options);
      const text = await response.text();

      if (!response.ok) {
        throw new Error(`${response.status} ${text || 'empty response'}`);
      }

      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`Risposta non JSON da ${normalizedBase}`);
      }
    } catch (error) {
      lastError = new Error(`${normalizedBase}: ${error.message}`);
    }
  }

  throw lastError || new Error('Nessun endpoint API disponibile');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

async function fetchPublicSheetTotals() {
  const url = `https://docs.google.com/spreadsheets/d/${SHARED_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Foglio1&range=Q14:V14`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Errore lettura foglio pubblico: ${response.status}`);
  }

  const text = await response.text();
  const [row = []] = parseCsv(text);

  return PLAYERS.map((name, index) => ({
    name,
    avatar: name[0].toUpperCase(),
    pointsTotal: Number(row[index] || 0)
  }));
}

function getDefaultRaceFilter(races) {
  return races.some((race) => race.isOngoing) ? 'ongoing' : 'upcoming';
}

function normalizeValue(value) {
  return (value || '').toString().trim().toLowerCase();
}

function resolveDriver(value) {
  const normalized = normalizeValue(value);
  if (!normalized) return null;

  return DRIVERS.find((driver) => {
    const fullName = normalizeValue(driver.name);
    const surname = normalizeValue(driver.name.split(' ').slice(1).join(' '));
    const lastName = normalizeValue(driver.name.split(' ').pop());
    return (
      normalizeValue(driver.id) === normalized ||
      fullName === normalized ||
      surname === normalized ||
      lastName === normalized
    );
  }) || null;
}

function PredictionTile({ label, value }) {
  const driver = resolveDriver(value);

  if (!driver) {
    return (
      <div className="rounded-lg bg-black/30 border border-white/5 p-2 sm:p-3">
        <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="font-semibold text-[12px] sm:text-sm text-zinc-100 leading-tight">{formatPrediction(value)}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-black/30 border border-white/5 p-2 sm:p-3 relative overflow-hidden min-h-[72px] sm:min-h-[92px]">
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: driver.hex }}
      />
      <div className="relative z-10">
        <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 sm:mb-2">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-black/40 border border-white/10 overflow-hidden shrink-0">
            {driver.img && (
              <img src={driver.img} alt={driver.name} className="w-full h-full object-cover object-top" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[12px] sm:text-sm text-zinc-100 truncate leading-tight">{driver.name.split(' ').pop()}</p>
            <p className="text-[9px] sm:text-[10px] text-zinc-500 truncate leading-tight">{driver.team}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PredictionGroup({ title, accentClass, items }) {
  return (
    <div className="rounded-xl sm:rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">
      <div className={clsx('px-2.5 sm:px-3 py-1.5 sm:py-2 border-b border-white/8', accentClass)}>
        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.24em] sm:tracking-[0.28em]">{title}</p>
      </div>
      <div className="p-2 sm:p-3 grid gap-2 grid-cols-1 sm:grid-cols-2">
        {items.map(([label, value]) => (
          <PredictionTile key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}

function RacePredictionsBoard({ predictions, compact = false }) {
  const [activePlayer, setActivePlayer] = useState(predictions[0]?.player || null);
  const touchStartXRef = useRef(null);
  const tabsScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (!predictions.some((entry) => entry.player === activePlayer)) {
      setActivePlayer(predictions[0]?.player || null);
    }
  }, [predictions, activePlayer]);

  const selectedEntry = predictions.find((entry) => entry.player === activePlayer) || predictions[0] || null;
  const activeIndex = predictions.findIndex((entry) => entry.player === selectedEntry?.player);

  const updateScrollHints = () => {
    const node = tabsScrollRef.current;
    if (!node) return;
    setCanScrollLeft(node.scrollLeft > 4);
    setCanScrollRight(node.scrollLeft + node.clientWidth < node.scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollHints();
  }, [predictions]);

  const moveSelection = (direction) => {
    if (!predictions.length || activeIndex === -1) return;
    const nextIndex = activeIndex + direction;
    if (nextIndex < 0 || nextIndex >= predictions.length) return;
    setActivePlayer(predictions[nextIndex].player);
  };

  const handleTouchStart = (event) => {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event) => {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX ?? null;
    touchStartXRef.current = null;

    if (startX == null || endX == null) return;
    const deltaX = endX - startX;
    if (Math.abs(deltaX) < 40) return;
    moveSelection(deltaX < 0 ? 1 : -1);
  };

  return (
    <div className={clsx('space-y-3', compact && 'space-y-2')}>
      <div className="md:hidden space-y-3">
        <div className="relative rounded-2xl border border-white/8 bg-black/25 p-1.5">
          {canScrollLeft && (
            <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <div className="w-6 h-6 rounded-full bg-black/70 border border-white/10 text-white/80 flex items-center justify-center shadow-lg">
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              </div>
            </div>
          )}
          {canScrollRight && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
              <div className="w-6 h-6 rounded-full bg-black/70 border border-white/10 text-white/80 flex items-center justify-center shadow-lg">
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          )}
          <div
            ref={tabsScrollRef}
            onScroll={updateScrollHints}
            className="flex gap-2 overflow-x-auto snap-x snap-mandatory no-scrollbar"
          >
          {predictions.map((entry) => (
            <button
              key={entry.player}
              type="button"
              onClick={() => setActivePlayer(entry.player)}
              className={clsx(
                'snap-start shrink-0 rounded-2xl px-3 py-2 text-left transition-all',
                activePlayer === entry.player
                  ? 'bg-white text-black shadow-lg'
                  : 'bg-transparent text-zinc-300'
              )}
            >
              <p className="font-semibold text-[11px] leading-none whitespace-nowrap">{entry.player}</p>
            </button>
          ))}
        </div>
        </div>

        {selectedEntry && (
          <div
            className="glass-panel rounded-xl border border-white/10 p-3 overflow-hidden min-h-[66vh] flex flex-col"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-[12px] text-white shadow-lg">
                {selectedEntry.avatar || playerInitial(selectedEntry.player)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[13px] leading-tight">{selectedEntry.player}</p>
                <p className="text-[9px] text-zinc-500 uppercase tracking-[0.18em]">Pronostico selezionato</p>
              </div>
              <div className="text-[9px] text-zinc-500 uppercase tracking-[0.14em]">
                {activeIndex + 1}/{predictions.length}
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <PredictionGroup
                title="Qualifica"
                accentClass="bg-cyan-500/12 text-cyan-200"
                items={[
                  ['Pole Position', selectedEntry.pole]
                ]}
              />
              <PredictionGroup
                title="Gara"
                accentClass="bg-amber-500/12 text-amber-200"
                items={[
                  ['1° posto', selectedEntry.first],
                  ['2° posto', selectedEntry.second],
                  ['3° posto', selectedEntry.third]
                ]}
              />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => moveSelection(-1)}
                disabled={activeIndex <= 0}
                className={clsx(
                  'flex-1 rounded-xl px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] transition-all',
                  activeIndex <= 0
                    ? 'bg-white/5 text-zinc-600 cursor-not-allowed'
                    : 'bg-white/10 text-white'
                )}
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => moveSelection(1)}
                disabled={activeIndex === -1 || activeIndex >= predictions.length - 1}
                className={clsx(
                  'flex-1 rounded-xl px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.18em] transition-all',
                  activeIndex === -1 || activeIndex >= predictions.length - 1
                    ? 'bg-white/5 text-zinc-600 cursor-not-allowed'
                    : 'bg-f1-red text-white shadow-lg shadow-f1-red/20'
                )}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="hidden md:grid gap-3">
        {predictions.map((entry) => (
          <div key={entry.player} className="glass-panel rounded-2xl border border-white/10 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white">
                {entry.avatar || playerInitial(entry.player)}
              </div>
              <div>
                <p className="font-bold text-sm">{entry.player}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Pronostico</p>
              </div>
            </div>
            <div className={clsx('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2')}>
              <PredictionGroup
                title="Qualifica"
                accentClass="bg-cyan-500/12 text-cyan-200"
                items={[
                  ['Pole Position', entry.pole]
                ]}
              />
              <PredictionGroup
                title="Gara"
                accentClass="bg-amber-500/12 text-amber-200"
                items={[
                  ['1° posto', entry.first],
                  ['2° posto', entry.second],
                  ['3° posto', entry.third]
                ]}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DriverPicker({ title, icon, position, predictions, openSection, setOpenSection, handleDriverSelect }) {
  const isOpen = openSection === position;
  const selectedDriver = predictions[position]
    ? DRIVERS.find((driver) => driver.id === predictions[position])
    : null;

  return (
    <div className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpenSection(isOpen ? null : position)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {icon}
          <span className="font-semibold text-xs sm:text-sm uppercase tracking-wide text-zinc-200">
            {title}
          </span>
          {selectedDriver && (
            <span className="text-[10px] sm:text-xs text-zinc-400">
              • {selectedDriver.name.split(' ').pop()}
            </span>
          )}
        </div>
        <ChevronRight className={clsx('w-4 h-4 text-zinc-500 transition-transform', isOpen && 'rotate-90')} />
      </button>

      {isOpen && (
        <div className="px-2 sm:px-4 pb-3 sm:pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {DRIVERS.map((driver) => {
              const isSelected = predictions[position] === driver.id;
              const isDisabled = isPodiumPosition(position)
                && !isSelected
                && [predictions.first, predictions.second, predictions.third].includes(driver.id);
              return (
                <button
                  key={driver.id}
                  onClick={() => !isDisabled && handleDriverSelect(position, driver.id)}
                  disabled={isDisabled}
                  className={clsx(
                    'p-2 rounded-xl text-xs font-bold transition-all border-l-[3px] text-left relative overflow-hidden group min-h-[60px] flex items-center',
                    isSelected
                      ? 'bg-white/10 shadow-inner ring-2 ring-offset-2 ring-offset-black/60'
                      : isDisabled
                        ? 'bg-black/20 text-zinc-500 opacity-40 cursor-not-allowed'
                        : 'bg-black/40 text-zinc-300 hover:bg-white/5 hover:-translate-y-[1px]'
                  )}
                  style={{ borderLeftColor: driver.hex }}
                >
                  {isSelected && (
                    <div
                      className="absolute top-0 right-0 w-8 h-8 -rotate-45 translate-x-4 -translate-y-4 shadow-lg z-10"
                      style={{ backgroundColor: driver.hex }}
                    ></div>
                  )}

                  <div
                    className={clsx(
                      'absolute right-0 bottom-0 transition-all duration-300 w-16 h-16 overflow-hidden pointer-events-none',
                      isSelected
                        ? 'opacity-100 mix-blend-normal'
                        : 'opacity-30 group-hover:opacity-60 mix-blend-screen'
                    )}
                  >
                    {driver.img && (
                      <img
                        src={driver.img}
                        alt={driver.name}
                        className={clsx(
                          'w-full h-full object-cover object-top filter transition-all duration-300',
                          isSelected
                            ? 'grayscale-0 contrast-100'
                            : 'grayscale contrast-125'
                        )}
                      />
                    )}
                  </div>

                  <div className="relative z-10 max-w-[75%]">
                    <div className="truncate group-hover:text-white transition-colors text-[11px]">
                      {driver.name.split(' ').pop()}
                    </div>
                    <div className="text-[9px] opacity-70 font-normal truncate mt-[1px]">
                      {driver.team}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = window.localStorage.getItem(STORAGE_KEYS.currentUser);
    return PLAYERS.includes(savedUser) ? savedUser : null;
  });
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('races');
  const [raceFilter, setRaceFilter] = useState(() => getDefaultRaceFilter(DEFAULT_RACES.map(normalizeRace)));
  const [selectedRace, setSelectedRace] = useState(null);
  const [predictions, setPredictions] = useState(EMPTY_PREDICTIONS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [standings, setStandings] = useState(null);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const [standingsError, setStandingsError] = useState(null);
  const [openSection, setOpenSection] = useState(null);
  const [isPredictionsOpen, setIsPredictionsOpen] = useState(false);
  const [racePredictions, setRacePredictions] = useState([]);
  const [racePredictionsLoading, setRacePredictionsLoading] = useState(false);
  const [racePredictionsError, setRacePredictionsError] = useState(null);
  const [raceLockInfo, setRaceLockInfo] = useState(null);
  const [raceScheduleMap, setRaceScheduleMap] = useState({});
  const [savedPredictions, setSavedPredictions] = useState(EMPTY_PREDICTIONS);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const historyStateKeyRef = useRef('');

  const races = standings?.races?.length >= DEFAULT_RACES.length ? standings.races : DEFAULT_RACES;
  const racesWithStatus = races.map(normalizeRace);
  const defaultRaceFilter = getDefaultRaceFilter(racesWithStatus);
  const activeRaceIdsKey = racesWithStatus.filter((race) => !race.done).map((race) => race.id).join(',');
  const nextUpcomingRace = racesWithStatus.find((race) => !race.done && !race.isOngoing) || null;
  const filteredRaces = racesWithStatus.filter((race) => {
    if (raceFilter === 'past') return race.done;
    if (raceFilter === 'ongoing') return race.isOngoing;
    return !race.done && !race.isOngoing;
  });
  const sortedStandings = [...(standings?.standings || [])].sort((a, b) => {
    const pointsDiff = Number(b.pointsTotal || 0) - Number(a.pointsTotal || 0);
    if (pointsDiff !== 0) return pointsDiff;
    return a.name.localeCompare(b.name, 'it');
  });
  const rankedStandings = buildStandingsWithRank(sortedStandings);
  const groupedStandings = groupStandingsByRank(rankedStandings);
  const hasSavedPrediction = !predictionsAreEqual(savedPredictions, EMPTY_PREDICTIONS);
  const hasPredictionChanges = !predictionsAreEqual(predictions, savedPredictions);
  const hasInvalidPodiumPredictions = hasDuplicatePodiumPredictions(predictions);
  const canEditSelectedRace = Boolean(
    selectedRace
    && nextUpcomingRace
    && selectedRace.id === nextUpcomingRace.id
    && !selectedRace.done
    && !selectedRace.isOngoing
    && !raceLockInfo?.isLocked
  );
  const currentRacePredictionsComplete = predictions.pole && predictions.first && predictions.second && predictions.third;
  const canSubmitSelectedRace = Boolean(canEditSelectedRace && currentRacePredictionsComplete && !hasInvalidPodiumPredictions && hasPredictionChanges && !isSubmitting);

  useEffect(() => {
    if (currentUser) {
      window.localStorage.setItem(STORAGE_KEYS.currentUser, currentUser);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    const nextState = {
      app: 'f1nta',
      activeTab,
      raceFilter,
      raceId: selectedRace?.id ?? null
    };
    const nextKey = JSON.stringify(nextState);

    if (historyStateKeyRef.current === '') {
      window.history.replaceState(nextState, '');
      historyStateKeyRef.current = nextKey;
      return;
    }

    if (historyStateKeyRef.current !== nextKey) {
      window.history.pushState(nextState, '');
      historyStateKeyRef.current = nextKey;
    }
  }, [activeTab, raceFilter, selectedRace]);

  useEffect(() => {
    const onPopState = async (event) => {
      const state = event.state;

      if (!state || state.app !== 'f1nta') {
        if (selectedRace) {
          setSelectedRace(null);
          setOpenSection(null);
          setIsPredictionsOpen(false);
          setRaceLockInfo(null);
        } else if (activeTab !== 'races') {
          setActiveTab('races');
        }
        return;
      }

      setActiveTab(state.activeTab || 'races');
      setRaceFilter(state.raceFilter || defaultRaceFilter);

      if (state.raceId) {
        const targetRace = racesWithStatus.find((race) => race.id === state.raceId);
        if (targetRace) {
          setSelectedRace(targetRace);
          setOpenSection(null);
          setIsPredictionsOpen(false);
          await loadRacePredictions(targetRace);
        }
      } else {
        setSelectedRace(null);
        setOpenSection(null);
        setIsPredictionsOpen(false);
        setRaceLockInfo(null);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [activeTab, raceFilter, racesWithStatus, selectedRace, defaultRaceFilter]);

  useEffect(() => {
    if (!selectedRace) {
      setRaceFilter(defaultRaceFilter);
    }
  }, [defaultRaceFilter, selectedRace]);

  useEffect(() => {
    const racesToLoad = racesWithStatus.filter((race) => !race.done);
    if (!racesToLoad.length) return;

    let cancelled = false;
    const missingRaces = racesToLoad.filter((race) => !raceScheduleMap[race.id]);
    if (!missingRaces.length) return;

    const loadSchedules = async () => {
      for (const race of missingRaces) {
        if (cancelled) return;

        try {
          const data = await apiFetchJson(`/race-schedule?raceId=${race.id}`);
          if (!cancelled && data) {
            setRaceScheduleMap((current) => ({
              ...current,
              [race.id]: data
            }));
          }
        } catch {
          // Ignore: the backend now returns safe fallbacks for rate limits.
        }

        await new Promise((resolve) => {
          window.setTimeout(resolve, 450);
        });
      }
    };

    loadSchedules();

    return () => {
      cancelled = true;
    };
  }, [activeRaceIdsKey, raceScheduleMap]);

  const handleLogin = (event) => {
    event.preventDefault();
    const normalizedName = normalizeValue(loginName);
    const normalizedPassword = normalizeValue(loginPassword);
    const matchedPlayer = PLAYERS.find((player) => normalizeValue(player) === normalizedName);

    if (!matchedPlayer || normalizedPassword !== normalizedName) {
      setLoginError('Credenziali non valide.');
      return;
    }

    setCurrentUser(matchedPlayer);
    setLoginError('');
    setLoginName('');
    setLoginPassword('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedRace(null);
    setPredictions(EMPTY_PREDICTIONS);
    setSavedPredictions(EMPTY_PREDICTIONS);
    setLoginPassword('');
    setLoginName('');
    setLoginError('');
    setIsMenuOpen(false);
    setRaceLockInfo(null);
  };

  useEffect(() => {
    setLoadingStandings(true);
    apiFetchJson('/standings')
      .then(async (data) => {
        try {
          const publicStandings = await fetchPublicSheetTotals();
          setStandings({
            ...data,
            standings: publicStandings
          });
        } catch {
          setStandings(data);
        }
        setStandingsError(null);
      })
      .catch((error) => {
        setStandingsError(`Impossibile caricare la classifica dal server. ${error.message}`);
      })
      .finally(() => setLoadingStandings(false));
  }, []);

  const loadRacePredictions = async (race) => {
    setRacePredictionsLoading(true);
    setRacePredictionsError(null);

    try {
      const [predictionsData, lockData] = await Promise.all([
        apiFetchJson(`/race-predictions?raceId=${race.id}`),
        apiFetchJson(`/race-lock?raceId=${race.id}`).catch(() => null)
      ]);
      const nextPredictions = predictionsData.predictions || [];
      setRacePredictions(nextPredictions);
      setRaceLockInfo(lockData?.success === false ? null : lockData);

      if (currentUser) {
        const own = nextPredictions.find((entry) => entry.player === currentUser);
        const nextOwnPredictions = normalizePredictionSet(own);
        setSavedPredictions(nextOwnPredictions);
        setPredictions(nextOwnPredictions);
      } else {
        setPredictions(EMPTY_PREDICTIONS);
        setSavedPredictions(EMPTY_PREDICTIONS);
      }
    } catch (error) {
      setRacePredictions([]);
      setRacePredictionsError(`Impossibile caricare i pronostici di questa gara. ${error.message}`);
      setPredictions(EMPTY_PREDICTIONS);
      setSavedPredictions(EMPTY_PREDICTIONS);
      setRaceLockInfo(null);
    } finally {
      setRacePredictionsLoading(false);
    }
  };

  const openRace = async (race) => {
    setSelectedRace(race);
    setOpenSection(null);
    setIsPredictionsOpen(false);
    setIsMenuOpen(false);
    await loadRacePredictions(race);
  };

  const changeTab = (tab) => {
    setSelectedRace(null);
    setOpenSection(null);
    setIsPredictionsOpen(false);
    setIsMenuOpen(false);
    setRaceLockInfo(null);
    setSavedPredictions(EMPTY_PREDICTIONS);
    setActiveTab(tab);
  };

  const handleDriverSelect = (position, driverId) => {
    if (isPodiumPosition(position)) {
      const nextPredictions = {
        ...predictions,
        [position]: driverId
      };

      if (hasDuplicatePodiumPredictions(nextPredictions)) {
        return;
      }
    }

    setPredictions((prev) => ({ ...prev, [position]: driverId }));
  };

  const submitPredictions = async () => {
    if (!currentUser || !selectedRace || !canEditSelectedRace) return;
    if (hasInvalidPodiumPredictions) return;

    try {
      setIsSubmitting(true);
      const data = await apiFetchJson('/submit-prediction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentUser,
          raceId: selectedRace.id,
          predictions
        })
      });
      if (!data.success) {
        alert('Errore nel salvataggio del pronostico.');
        return;
      }

      alert('Pronostico salvato correttamente.');
      await loadRacePredictions(selectedRace);
    } catch {
      alert('Errore di rete nel salvataggio del pronostico.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-24 max-w-md mx-auto relative min-h-screen">
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 bg-black/30 shadow-lg shadow-black/30 shrink-0">
            <img src="/fanta-f1-logo.png" alt="Fanta F1 logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight leading-none uppercase italic">Fanta F1</h1>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">Campionato 2026</p>
          </div>
        </div>

        <div className="relative flex items-center gap-2">
          {currentUser && (
            <div className="flex items-center gap-2 bg-white/5 rounded-full pl-2 pr-3 py-1.5 border border-white/10">
              <div className="w-6 h-6 rounded-full bg-f1-blue flex items-center justify-center">
                <span className="text-white text-xs font-bold">{currentUser[0]}</span>
              </div>
              <span className="text-sm font-medium">{currentUser}</span>
            </div>
          )}

          <button
            onClick={() => setIsMenuOpen((value) => !value)}
            className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Apri menu"
          >
            {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-12 min-w-[220px] rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden">
              <a
                href={SHARED_SHEET_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-200 hover:bg-white/5 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Apri file condiviso
              </a>
              {currentUser && (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-200 hover:bg-white/5 transition-colors border-t border-white/5"
                >
                  <LogOut className="w-4 h-4 text-zinc-400" />
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="p-4 space-y-6">
        {!currentUser ? (
          <div className="min-h-[calc(100vh-10rem)] flex items-center">
            <div className="w-full rounded-[2rem] overflow-hidden border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 shadow-2xl shadow-black/50">
              <div className="px-6 pt-8 pb-5 border-b border-white/5 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.25),_transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 bg-black/30 shadow-xl shadow-black/30 shrink-0">
                    <img src="/fanta-f1-logo.png" alt="Fanta F1 logo" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">Accesso Paddock</p>
                    <h2 className="text-2xl font-black uppercase italic">Fanta F1 2026</h2>
                  </div>
                </div>
                <p className="text-sm text-zinc-300 max-w-sm">
                  Accesso riservato ai piloti del campionato F1NTA 2026.
                </p>
              </div>

              <div className="p-6 space-y-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <label className="block">
                    <span className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">Username</span>
                    <div className="mt-2 flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                      <User className="w-4 h-4 text-zinc-500" />
                      <input
                        value={loginName}
                        onChange={(event) => setLoginName(event.target.value.toLowerCase())}
                        className="w-full bg-transparent outline-none text-sm text-white placeholder:text-zinc-600"
                        autoComplete="username"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">Password</span>
                    <div className="mt-2 flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                      <Lock className="w-4 h-4 text-zinc-500" />
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={(event) => setLoginPassword(event.target.value.toLowerCase())}
                        className="w-full bg-transparent outline-none text-sm text-white placeholder:text-zinc-600"
                        autoComplete="current-password"
                      />
                    </div>
                  </label>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-f1-red text-white font-black uppercase tracking-[0.2em] shadow-xl shadow-f1-red/25 hover:bg-red-700 transition-colors"
                  >
                    Entra
                  </button>
                </form>
                {loginError && <p className="text-sm text-red-500">{loginError}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div className="flex gap-2 p-1 glass-panel rounded-lg">
              <button
                onClick={() => changeTab('races')}
                className={clsx('flex-1 py-2 text-sm font-bold rounded-md transition-all', activeTab === 'races' ? 'bg-f1-red text-white shadow-lg shadow-f1-red/20' : 'text-zinc-400 hover:text-white')}
              >
                GARE
              </button>
              <button
                onClick={() => changeTab('standings')}
                className={clsx('flex-1 py-2 text-sm font-bold rounded-md transition-all', activeTab === 'standings' ? 'bg-f1-red text-white shadow-lg shadow-f1-red/20' : 'text-zinc-400 hover:text-white')}
              >
                CLASSIFICA
              </button>
            </div>

            {activeTab === 'races' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-f1-red" /> Gare
                  </h3>
                </div>

                <div className="flex gap-2 p-1 glass-panel rounded-lg">
                  <button
                    onClick={() => setRaceFilter('ongoing')}
                    className={clsx('flex-1 py-2 text-xs font-bold rounded-md transition-all', raceFilter === 'ongoing' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white')}
                  >
                    IN CORSO
                  </button>
                  <button
                    onClick={() => setRaceFilter('upcoming')}
                    className={clsx('flex-1 py-2 text-xs font-bold rounded-md transition-all', raceFilter === 'upcoming' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white')}
                  >
                    PROSSIME
                  </button>
                  <button
                    onClick={() => setRaceFilter('past')}
                    className={clsx('flex-1 py-2 text-xs font-bold rounded-md transition-all', raceFilter === 'past' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white')}
                  >
                    PASSATE
                  </button>
                </div>

                <div className="space-y-3">
                  {filteredRaces.map((race) => {
                    const isNextAvailableRace = nextUpcomingRace?.id === race.id;
                    const raceSchedule = raceScheduleMap[race.id];
                    const qualifyingLabel = formatSessionDateTime(raceSchedule?.qualifying?.dateStart);
                    const raceSessionLabel = formatSessionDateTime(raceSchedule?.raceSession?.dateStart);
                    const weekendDayBadge = formatWeekendDayBadge(
                      raceSchedule?.qualifying?.dateStart,
                      raceSchedule?.raceSession?.dateStart,
                      race.date
                    );
                    return (
                      <div key={race.id} className="glass-panel rounded-xl overflow-hidden border border-white/5 group relative">
                        <div className="p-4 flex gap-4">
                          <div className="w-14 rounded-lg bg-black/40 border border-white/5 flex flex-col items-center justify-center p-2 text-center shadow-inner">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase">{race.date.split(' ')[1]}</span>
                            <span className="text-lg font-black leading-none">{weekendDayBadge}</span>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {race.isSprint && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-f1-orange/20 text-f1-orange border border-f1-orange/20 flex items-center gap-1">
                                  <Flame className="w-3 h-3" /> SPRINT
                                </span>
                              )}
                              <h4 className="font-bold text-lg leading-tight uppercase tracking-wide">{race.name.replace(' SPRINT', '')}</h4>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-zinc-400 font-medium">
                              <div className="flex flex-col gap-1">
                                {qualifyingLabel && (
                                  <span className="flex items-center gap-1">
                                    <Timer className="w-3.5 h-3.5" /> Qualifica {qualifyingLabel}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" /> Gara {raceSessionLabel || `${race.date} • ${race.time}`}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-center pr-2">
                            <button
                              onClick={() => openRace(race)}
                              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-f1-red text-white hover:bg-red-700 shadow-lg shadow-f1-red/30 cursor-pointer z-10"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        <div className={clsx('px-4 py-2 text-xs font-semibold flex items-center gap-1 border-t', race.isOngoing ? 'bg-red-950/30 text-red-500 border-f1-red/10' : race.done ? 'bg-white/5 text-zinc-400 border-white/5' : isNextAvailableRace ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/10' : 'bg-white/5 text-zinc-500 border-white/5')}>
                          {race.isOngoing ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-f1-red animate-pulse"></span>
                              GARA IN CORSO
                            </>
                          ) : race.done ? (
                            <>
                              <Eye className="w-3.5 h-3.5 opacity-70" />
                              VEDI PRONOSTICI INSERITI
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 opacity-70" />
                              {isNextAvailableRace ? 'PRONOSTICI DISPONIBILI' : 'NON ANCORA DISPONIBILI'}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'standings' && !selectedRace && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" /> Classifica Mondiale
                  </h3>
                </div>

                <div className="space-y-3">
                  {loadingStandings && <p className="text-sm text-zinc-400">Caricamento classifica...</p>}
                  {standingsError && <p className="text-sm text-red-500">{standingsError}</p>}
                  {groupedStandings.map((group) => (
                    <div key={`${group.rank}-${group.pointsTotal}`} className="glass-panel flex items-center p-4 rounded-xl border border-white/5 relative overflow-hidden group">
                      <div className="w-8 flex justify-center font-black text-xl italic text-zinc-500">
                        {group.rank}
                      </div>
                      <div className="flex-1 flex items-center gap-3 ml-2 min-w-0">
                        <div className="flex -space-x-2">
                          {group.players.map((player) => (
                            <div
                              key={player.name}
                              className={clsx(
                                'w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg border-2 border-f1-darker',
                                group.rank === 1 ? 'bg-yellow-500 text-black' : group.rank === 2 ? 'bg-zinc-300 text-black' : group.rank === 3 ? 'bg-orange-400 text-black' : 'bg-zinc-800 text-white'
                              )}
                            >
                              {player.avatar}
                            </div>
                          ))}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-base leading-tight group-hover:text-f1-red transition-colors flex flex-wrap gap-x-2 gap-y-1">
                            {group.players.map((player, index) => (
                              <span key={player.name} className="break-words">
                                {player.name}
                                {index < group.players.length - 1 ? ' •' : ''}
                              </span>
                            ))}
                          </div>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider mt-1 border-b border-zinc-700 pb-0.5 inline-block">
                            {group.players.length > 1 ? 'Pari merito' : 'Scuderia Fanta'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-2xl text-white">{group.pointsTotal}</p>
                        <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Punti</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedRace && (
              <div className="fixed inset-0 z-[100] bg-black/[0.96] backdrop-blur-sm flex items-center justify-center animate-in fade-in slide-in-from-bottom-8 duration-300">
                <div className="relative w-full max-w-5xl h-[90vh] mx-2 rounded-3xl overflow-hidden f1-grid-bg border border-white/10 shadow-2xl shadow-black/70 flex flex-col">
                  <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-b from-black/90 via-f1-darker/90 to-f1-darker/80 border-b border-white/5">
                    <button
                      onClick={() => setSelectedRace(null)}
                      className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                        {canEditSelectedRace ? 'Fanta F1 • Inserisci pronostico' : 'Fanta F1 • Pronostici gara'}
                      </p>
                      <h3 className="font-bold uppercase tracking-wide text-lg">{selectedRace.name}</h3>
                      <p className="text-[11px] text-zinc-400">
                        {selectedRace.date} • {selectedRace.time}{selectedRace.isSprint ? ' • Sprint' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 py-4 space-y-6">
                    {raceLockInfo?.isLocked && (
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-200">
                          Pronostici bloccati
                        </p>
                        <p className="text-sm text-amber-50/80 mt-1">
                          Le qualifiche sono iniziate, quindi per questa gara non puoi piu modificare il pronostico.
                        </p>
                      </div>
                    )}

                    {!canEditSelectedRace && hasSavedPrediction && (
                      <>
                        <div className="space-y-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500 px-1">
                            Il tuo pronostico
                          </p>
                          <PredictionGroup
                            title="Qualifiche"
                            accentClass="bg-white/5 text-zinc-200"
                            items={[
                              ['Pole Position', savedPredictions.pole]
                            ]}
                          />
                        </div>

                        <div className="space-y-3">
                          <PredictionGroup
                            title="Gara"
                            accentClass="bg-white/5 text-zinc-200"
                            items={[
                              ['1° Classificato', savedPredictions.first],
                              ['2° Classificato', savedPredictions.second],
                              ['3° Classificato', savedPredictions.third]
                            ]}
                          />
                        </div>
                      </>
                    )}

                    {canEditSelectedRace && (
                      <>
                        {hasInvalidPodiumPredictions && (
                          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                            <p className="text-sm text-red-200">
                              1°, 2° e 3° classificato devono essere tre piloti diversi.
                            </p>
                          </div>
                        )}
                        <div className="space-y-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500 px-1">
                            Qualifiche • Pole Position
                          </p>
                          <DriverPicker
                            title="Pole Position"
                            icon={<Timer className="w-4 h-4" />}
                            position="pole"
                            predictions={predictions}
                            openSection={openSection}
                            setOpenSection={setOpenSection}
                            handleDriverSelect={handleDriverSelect}
                          />
                        </div>

                        <div className="space-y-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500 px-1 mt-2">
                            Gara • Ordine d'arrivo
                          </p>
                          <DriverPicker
                            title="1° Classificato"
                            icon={<Trophy className="w-4 h-4 text-yellow-500" />}
                            position="first"
                            predictions={predictions}
                            openSection={openSection}
                            setOpenSection={setOpenSection}
                            handleDriverSelect={handleDriverSelect}
                          />
                          <DriverPicker
                            title="2° Classificato"
                            icon={<Trophy className="w-4 h-4 text-zinc-400" />}
                            position="second"
                            predictions={predictions}
                            openSection={openSection}
                            setOpenSection={setOpenSection}
                            handleDriverSelect={handleDriverSelect}
                          />
                          <DriverPicker
                            title="3° Classificato"
                            icon={<Trophy className="w-4 h-4 text-orange-400" />}
                            position="third"
                            predictions={predictions}
                            openSection={openSection}
                            setOpenSection={setOpenSection}
                            handleDriverSelect={handleDriverSelect}
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-3">
                      <div className="rounded-2xl overflow-hidden border border-cyan-500/20 bg-cyan-500/10">
                        <button
                          type="button"
                          onClick={() => setIsPredictionsOpen((value) => !value)}
                          className="w-full flex items-center justify-between px-4 py-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-cyan-400/20 text-cyan-300 flex items-center justify-center">
                              <Eye className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-200">
                                Pronostici dei giocatori
                              </p>
                              <p className="text-xs text-cyan-100/70">
                                Apri per vedere tutte le scelte inserite per questa gara
                              </p>
                            </div>
                          </div>
                          <ChevronRight className={clsx('w-5 h-5 text-cyan-200 transition-transform', isPredictionsOpen && 'rotate-90')} />
                        </button>

                        {isPredictionsOpen && (
                          <div className="px-3 pb-3">
                            {racePredictionsLoading && <p className="text-sm text-zinc-200 px-1">Caricamento pronostici...</p>}
                            {racePredictionsError && <p className="text-sm text-red-300 px-1">{racePredictionsError}</p>}
                            {!racePredictionsLoading && !racePredictionsError && (
                              <div className="pr-1">
                                <RacePredictionsBoard predictions={racePredictions} compact={canEditSelectedRace} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {canEditSelectedRace && (
                    <div className="px-6 py-4 bg-gradient-to-t from-black via-black/95 to-transparent border-t border-white/5">
                      <button
                        onClick={submitPredictions}
                        disabled={!canSubmitSelectedRace}
                        className={clsx(
                          'w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl',
                          canSubmitSelectedRace
                            ? 'bg-f1-red text-white hover:bg-red-700 shadow-f1-red/30 hover:-translate-y-1 active:scale-95 cursor-pointer'
                            : 'bg-white/5 text-zinc-600 cursor-not-allowed'
                        )}
                      >
                        {isSubmitting
                          ? 'Salvataggio...'
                          : hasSavedPrediction
                            ? hasPredictionChanges
                              ? 'Cambia Pronostico'
                              : 'Pronostico Gia Salvato'
                            : 'Conferma Pronostico'}
                        {!isSubmitting && <CheckCircle2 className="w-5 h-5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
