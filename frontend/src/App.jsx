import React, { useEffect, useState } from 'react';
import { Trophy, ChevronRight, User, Calendar, Flame, Timer, CheckCircle2, Eye, Lock, LogOut } from 'lucide-react';
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

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
const EMPTY_PREDICTIONS = { pole: '', first: '', second: '', third: '' };

function toRaceDate(race) {
  const [day, month] = race.date.split(' ');
  const monthIndex = MONTH_MAP[month];
  if (monthIndex === undefined) return null;
  const [hours, minutes] = race.time.split(':').map(Number);
  return new Date(2026, monthIndex, Number(day), hours, minutes);
}

function normalizeRace(race) {
  const raceDate = toRaceDate(race);
  return {
    ...race,
    done: raceDate ? raceDate < new Date() : false
  };
}

function playerInitial(name) {
  return name?.[0]?.toUpperCase() || '?';
}

function formatPrediction(value) {
  return value || '—';
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
      <div className="rounded-xl bg-black/30 border border-white/5 p-3">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="font-semibold text-sm text-zinc-100">{formatPrediction(value)}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-black/30 border border-white/5 p-3 relative overflow-hidden min-h-[92px]">
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: driver.hex }}
      />
      <div className="relative z-10">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-11 h-11 rounded-xl bg-black/40 border border-white/10 overflow-hidden shrink-0">
            {driver.img && (
              <img src={driver.img} alt={driver.name} className="w-full h-full object-cover object-top" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-zinc-100 truncate">{driver.name.split(' ').pop()}</p>
            <p className="text-[10px] text-zinc-500 truncate">{driver.team}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function RacePredictionsBoard({ predictions, compact = false }) {
  return (
    <div className={clsx('space-y-3', compact && 'space-y-2')}>
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
          <div className={clsx('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4')}>
            {[
              ['Pole', entry.pole],
              ['1°', entry.first],
              ['2°', entry.second],
              ['3°', entry.third]
            ].map(([label, value]) => (
              <PredictionTile key={label} label={label} value={value} />
            ))}
          </div>
        </div>
      ))}
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
              return (
                <button
                  key={driver.id}
                  onClick={() => handleDriverSelect(position, driver.id)}
                  className={clsx(
                    'p-2 rounded-xl text-xs font-bold transition-all border-l-[3px] text-left relative overflow-hidden group min-h-[60px] flex items-center',
                    isSelected
                      ? 'bg-white/10 shadow-inner ring-2 ring-offset-2 ring-offset-black/60'
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
  const [currentUser, setCurrentUser] = useState(null);
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('races');
  const [raceFilter, setRaceFilter] = useState('upcoming');
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

  const races = standings?.races?.length >= DEFAULT_RACES.length ? standings.races : DEFAULT_RACES;
  const racesWithStatus = races.map(normalizeRace);
  const activeRaceId = racesWithStatus.find((race) => !race.done)?.id ?? null;
  const filteredRaces = racesWithStatus.filter((race) => raceFilter === 'past' ? race.done : !race.done);
  const canEditSelectedRace = selectedRace && !selectedRace.done && selectedRace.id === activeRaceId;
  const currentRacePredictionsComplete = predictions.pole && predictions.first && predictions.second && predictions.third;

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
    setLoginPassword('');
    setLoginName('');
    setLoginError('');
  };

  useEffect(() => {
    setLoadingStandings(true);
    fetch(`${API_BASE}/standings`)
      .then((res) => res.json())
      .then((data) => {
        setStandings(data);
        setStandingsError(null);
      })
      .catch(() => {
        setStandingsError('Impossibile caricare la classifica dal server.');
      })
      .finally(() => setLoadingStandings(false));
  }, []);

  const loadRacePredictions = async (race) => {
    setRacePredictionsLoading(true);
    setRacePredictionsError(null);

    try {
      const res = await fetch(`${API_BASE}/race-predictions?raceId=${race.id}`);
      const data = await res.json();
      const nextPredictions = data.predictions || [];
      setRacePredictions(nextPredictions);

      if (canEditRace(race, activeRaceId) && currentUser) {
        const own = nextPredictions.find((entry) => entry.player === currentUser);
        setPredictions(own ? {
          pole: own.pole || '',
          first: own.first || '',
          second: own.second || '',
          third: own.third || ''
        } : EMPTY_PREDICTIONS);
      } else {
        setPredictions(EMPTY_PREDICTIONS);
      }
    } catch {
      setRacePredictions([]);
      setRacePredictionsError('Impossibile caricare i pronostici di questa gara.');
      setPredictions(EMPTY_PREDICTIONS);
    } finally {
      setRacePredictionsLoading(false);
    }
  };

  const openRace = async (race) => {
    setSelectedRace(race);
    setOpenSection(null);
    setIsPredictionsOpen(false);
    await loadRacePredictions(race);
  };

  const handleDriverSelect = (position, driverId) => {
    setPredictions((prev) => ({ ...prev, [position]: driverId }));
  };

  const submitPredictions = async () => {
    if (!currentUser || !selectedRace || !canEditSelectedRace) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE}/submit-prediction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: currentUser,
          raceId: selectedRace.id,
          predictions
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
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
          <div className="w-8 h-8 rounded bg-gradient-to-br from-f1-red to-orange-600 flex items-center justify-center shadow-lg shadow-f1-red/20">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight leading-none uppercase italic">Fanta F1</h1>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">Campionato 2026</p>
          </div>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2 bg-white/5 rounded-full pl-2 pr-4 py-1.5 border border-white/10">
            <div className="w-6 h-6 rounded-full bg-f1-blue flex items-center justify-center">
              <span className="text-white text-xs font-bold">{currentUser[0]}</span>
            </div>
            <span className="text-sm font-medium">{currentUser}</span>
            <button
              onClick={handleLogout}
              className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      <main className="p-4 space-y-6">
        {!currentUser ? (
          <div className="min-h-[calc(100vh-10rem)] flex items-center">
            <div className="w-full rounded-[2rem] overflow-hidden border border-white/10 bg-gradient-to-br from-zinc-950 via-black to-zinc-900 shadow-2xl shadow-black/50">
              <div className="px-6 pt-8 pb-5 border-b border-white/5 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.25),_transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-f1-red to-orange-500 flex items-center justify-center shadow-lg shadow-f1-red/25">
                    <Trophy className="w-6 h-6 text-white" />
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
                onClick={() => setActiveTab('races')}
                className={clsx('flex-1 py-2 text-sm font-bold rounded-md transition-all', activeTab === 'races' ? 'bg-f1-red text-white shadow-lg shadow-f1-red/20' : 'text-zinc-400 hover:text-white')}
              >
                GARE
              </button>
              <button
                onClick={() => setActiveTab('standings')}
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
                    const isOpenRace = race.id === activeRaceId && !race.done;
                    return (
                      <div key={race.id} className="glass-panel rounded-xl overflow-hidden border border-white/5 group relative">
                        <div className="p-4 flex gap-4">
                          <div className="w-14 rounded-lg bg-black/40 border border-white/5 flex flex-col items-center justify-center p-2 text-center shadow-inner">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase">{race.date.split(' ')[1]}</span>
                            <span className="text-lg font-black leading-none">{race.date.split(' ')[0]}</span>
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
                              <span className="flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> {race.time}</span>
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

                        <div className={clsx('px-4 py-2 text-xs font-semibold flex items-center gap-1 border-t', isOpenRace ? 'bg-red-950/30 text-red-500 border-f1-red/10' : 'bg-white/5 text-zinc-400 border-white/5')}>
                          {isOpenRace ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-f1-red animate-pulse"></span>
                              PRONOSTICI APERTI
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 opacity-70" />
                              {race.done ? 'VEDI PRONOSTICI INSERITI' : 'VEDI GARA E PRONOSTICI'}
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
                  {standings?.standings?.map((player, idx) => (
                    <div key={player.name} className="glass-panel flex items-center p-4 rounded-xl border border-white/5 relative overflow-hidden group">
                      <div className="w-8 flex justify-center font-black text-xl italic text-zinc-500">
                        {idx + 1}
                      </div>
                      <div className="flex-1 flex items-center gap-3 ml-2">
                        <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg', idx === 0 ? 'bg-yellow-500 text-black' : idx === 1 ? 'bg-zinc-300 text-black' : idx === 2 ? 'bg-orange-400 text-black' : 'bg-zinc-800 text-white')}>
                          {player.avatar}
                        </div>
                        <div>
                          <p className="font-bold text-lg leading-none group-hover:text-f1-red transition-colors">{player.name}</p>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider mt-1 border-b border-zinc-700 pb-0.5 inline-block">Scuderia Fanta</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-2xl text-white">{player.pointsTotal}</p>
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
                    {canEditSelectedRace && (
                      <>
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
                              <RacePredictionsBoard predictions={racePredictions} compact={canEditSelectedRace} />
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
                        disabled={!currentRacePredictionsComplete || isSubmitting}
                        className={clsx(
                          'w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl',
                          currentRacePredictionsComplete && !isSubmitting
                            ? 'bg-f1-red text-white hover:bg-red-700 shadow-f1-red/30 hover:-translate-y-1 active:scale-95 cursor-pointer'
                            : 'bg-white/5 text-zinc-600 cursor-not-allowed'
                        )}
                      >
                        {isSubmitting ? 'Salvataggio...' : 'Conferma Pronostico'}
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

function canEditRace(race, activeRaceId) {
  return !race.done && race.id === activeRaceId;
}
