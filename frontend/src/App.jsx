import React, { useState } from 'react';
import { Trophy, ChevronRight, User, Calendar, Flame, Timer, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

// Semplice database mockato dei giocatori e gare iniziali
const PLAYERS = ['Andrea', 'Giovanni', 'Luca', 'Marco', 'Michele', 'Salvo'];

import { DRIVERS } from './drivers';

const DEFAULT_RACES = [
  { id: 1, name: "AUSTRALIA", date: "07 MAR", time: "06:00", isSprint: false, done: false },
  { id: 2, name: "CINA SPRINT", date: "13 MAR", time: "08:30", isSprint: true, done: false },
  { id: 3, name: "CINA", date: "14 MAR", time: "08:00", isSprint: false, done: false }
];

const MOCK_STANDINGS = [
  { name: 'Andrea', points: 6, avatar: 'A' },
  { name: 'Luca', points: 6, avatar: 'L' },
  { name: 'Marco', points: 6, avatar: 'M' },
  { name: 'Giovanni', points: 4, avatar: 'G' },
  { name: 'Salvo', points: 3, avatar: 'S' },
  { name: 'Michele', points: 2, avatar: 'M' }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('races'); // 'races', 'standings'
  const [selectedRace, setSelectedRace] = useState(null);
  const [predictions, setPredictions] = useState({ pole: '', first: '', second: '', third: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDriverSelect = (position, driverId) => {
    setPredictions(prev => ({ ...prev, [position]: driverId }));
  };

  const currentRacePredictionsComplete = predictions.pole && predictions.first && predictions.second && predictions.third;

  const submitPredictions = () => {
    setIsSubmitting(true);
    // Simula chiamata di rete a Google Sheets / Cloudflare
    setTimeout(() => {
      setIsSubmitting(false);
      alert('Pronostici salvati (Simulazione completata)');
      setSelectedRace(null);
      setPredictions({ pole: '', first: '', second: '', third: '' });
    }, 1500);
  };

  return (
    <div className="pb-24 max-w-md mx-auto relative min-h-screen">
      {/* Header Premium F1 */}
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
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="p-4 space-y-6">

        {/* Step 1: Selezione Utente (Se non loggato) */}
        {!currentUser ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2 mt-8">
              <h2 className="text-2xl font-bold">Benvenuto ai Box</h2>
              <p className="text-zinc-400 text-sm">Seleziona il tuo profilo pilota per continuare e inserire i pronostici.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-8">
              {PLAYERS.map(player => (
                <button
                  key={player}
                  onClick={() => setCurrentUser(player)}
                  className="glass-panel p-4 rounded-xl flex flex-col items-center justify-center gap-3 hover:bg-white/5 hover:-translate-y-1 transition-all active:scale-95 border border-white/5 hover:border-f1-red/50 group"
                >
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-transparent group-hover:border-f1-red transition-colors">
                    <User className="w-6 h-6 text-zinc-400 group-hover:text-white" />
                  </div>
                  <span className="font-semibold text-zinc-200 group-hover:text-white">{player}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (

          /* Step 2: Dashboard (Se loggato) */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

            <div className="flex gap-2 p-1 glass-panel rounded-lg">
              <button
                onClick={() => setActiveTab('races')}
                className={clsx("flex-1 py-2 text-sm font-bold rounded-md transition-all", activeTab === 'races' ? 'bg-f1-red text-white shadow-lg shadow-f1-red/20' : 'text-zinc-400 hover:text-white')}
              >
                GARE
              </button>
              <button
                onClick={() => setActiveTab('standings')}
                className={clsx("flex-1 py-2 text-sm font-bold rounded-md transition-all", activeTab === 'standings' ? 'bg-f1-red text-white shadow-lg shadow-f1-red/20' : 'text-zinc-400 hover:text-white')}
              >
                CLASSIFICA
              </button>
            </div>

            {activeTab === 'races' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-f1-red" /> Prossimi GP
                  </h3>
                </div>

                <div className="space-y-3">
                  {DEFAULT_RACES.map((race, idx) => (
                    <div key={race.id} className="glass-panel rounded-xl overflow-hidden border border-white/5 group relative">
                      <div className="p-4 flex gap-4">
                        {/* Data Badge */}
                        <div className="w-14 rounded-lg bg-black/40 border border-white/5 flex flex-col items-center justify-center p-2 text-center shadow-inner">
                          <span className="text-[10px] text-zinc-400 font-bold uppercase">{race.date.split(' ')[1]}</span>
                          <span className="text-lg font-black leading-none">{race.date.split(' ')[0]}</span>
                        </div>

                        {/* Info Gara */}
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

                        {/* Chevron */}
                        <div className="flex items-center justify-center pr-2">
                          <button
                            onClick={() => idx === 0 && setSelectedRace(race)}
                            className={clsx("w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                              idx === 0 ? "bg-f1-red text-white hover:bg-red-700 shadow-lg shadow-f1-red/30 cursor-pointer z-10" : "bg-white/5 text-zinc-600 cursor-not-allowed")}
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Status Bar */}
                      {idx === 0 ? (
                        <div
                          className="bg-red-950/30 px-4 py-2 text-xs font-semibold text-red-500 flex items-center gap-1 border-t border-f1-red/10 cursor-pointer hover:bg-red-950/50 transition-colors"
                          onClick={() => setSelectedRace(race)}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-f1-red animate-pulse"></span>
                          PRONOSTICI APERTI - INSERISCI ORA
                        </div>
                      ) : (
                        <div className="bg-white/5 px-4 py-2 text-xs font-medium text-zinc-500 flex items-center gap-1 border-t border-white/5">
                          <CheckCircle2 className="w-3.5 h-3.5 opacity-50" /> {race.done ? 'Pronostico inviato' : 'Chiuso'}
                        </div>
                      )}
                    </div>
                  ))}
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
                  {MOCK_STANDINGS.map((player, idx) => (
                    <div key={player.name} className="glass-panel flex items-center p-4 rounded-xl border border-white/5 relative overflow-hidden group">
                      {idx === 0 && <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-transparent -rotate-45 translate-x-8 -translate-y-8 pointer-events-none"></div>}

                      {/* Posizione */}
                      <div className="w-8 flex justify-center font-black text-xl italic text-zinc-500">
                        {idx + 1}
                      </div>

                      {/* Avatar e Nome */}
                      <div className="flex-1 flex items-center gap-3 ml-2">
                        <div className={clsx(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg",
                          idx === 0 ? "bg-yellow-500 text-black" :
                            idx === 1 ? "bg-zinc-300 text-black" :
                              idx === 2 ? "bg-orange-400 text-black" :
                                "bg-zinc-800 text-white"
                        )}>
                          {player.avatar}
                        </div>
                        <div>
                          <p className="font-bold text-lg leading-none group-hover:text-f1-red transition-colors">{player.name}</p>
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider mt-1 border-b border-zinc-700 pb-0.5 inline-block">Scuderia Fanta</p>
                        </div>
                      </div>

                      {/* Punti */}
                      <div className="text-right">
                        <p className="font-black text-2xl text-white">{player.points}</p>
                        <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Punti</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Regolamento Rapido */}
                <div className="glass-panel rounded-xl p-4 border border-white/5 mt-8 space-y-3">
                  <h4 className="font-bold text-sm tracking-widest uppercase border-b border-white/10 pb-2 text-zinc-400">Punteggi</h4>
                  <ul className="text-xs space-y-2 text-zinc-300 font-medium">
                    <li className="flex justify-between items-center"><span className="text-zinc-500">Pos. Finale Esatta</span> <span className="text-f1-red font-bold">+5 pt</span></li>
                    <li className="flex justify-between items-center"><span className="text-zinc-500">Sul Podio (Pos. errata)</span> <span className="text-f1-red font-bold">+1 pt</span></li>
                    <li className="flex justify-between items-center"><span className="text-zinc-500">Pos. Podio Esatta</span> <span className="text-f1-red font-bold">+3 pt</span></li>
                    <li className="flex justify-between items-center"><span className="text-zinc-500">Pole Position Esatta</span> <span className="text-f1-red font-bold">+2 pt</span></li>
                    <li className="flex justify-between items-center border-t border-white/10 pt-2"><span className="text-zinc-500">Costruttori Esatto</span> <span className="text-f1-red font-bold">+5 pt</span></li>
                  </ul>
                </div>
              </div>
            )}

            {/* modale Pronostici (Dettaglio Gara) */}
            {selectedRace && (
              <div className="fixed inset-0 z-[100] bg-f1-darker flex flex-col overflow-y-auto animate-in fade-in slide-in-from-bottom-8 duration-300">
                <div className="sticky top-0 bg-f1-darker/90 backdrop-blur-xl border-b border-white/5 p-4 flex items-center gap-3 z-10">
                  <button
                    onClick={() => setSelectedRace(null)}
                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                  </button>
                  <div>
                    <h3 className="font-bold uppercase tracking-wide">{selectedRace.name}</h3>
                    <p className="text-xs text-f1-red font-semibold">INSERIMENTO PRONOSTICO</p>
                  </div>
                </div>

                <div className="p-4 space-y-8 pb-32">
                  {[
                    { id: 'pole', label: 'Pole Position', icon: <Timer className="w-4 h-4" /> },
                    { id: 'first', label: '1° Classificato', icon: <Trophy className="w-4 h-4 text-yellow-500" /> },
                    { id: 'second', label: '2° Classificato', icon: <Trophy className="w-4 h-4 text-zinc-400" /> },
                    { id: 'third', label: '3° Classificato', icon: <Trophy className="w-4 h-4 text-orange-400" /> },
                  ].map(pos => (
                    <div key={pos.id} className="space-y-3">
                      <h4 className="font-bold flex items-center gap-2 border-b border-white/10 pb-2">
                        {pos.icon} {pos.label}
                      </h4>

                      <div className="grid grid-cols-3 gap-2">
                        {DRIVERS.map(driver => {
                          const isSelected = predictions[pos.id] === driver.id;
                          return (
                            <button
                              key={driver.id}
                              onClick={() => handleDriverSelect(pos.id, driver.id)}
                              className={clsx(
                                "p-2 rounded-lg text-xs font-bold transition-all border-l-[3px] text-left relative overflow-hidden group min-h-[50px] flex items-center",
                                isSelected
                                  ? "bg-white/10 shadow-inner"
                                  : "bg-black/20 text-zinc-300 hover:bg-white/5"
                              )}
                              style={{ borderLeftColor: driver.hex }}
                            >
                              {/* Overlay Selezione */}
                              {isSelected && <div className="absolute top-0 right-0 w-8 h-8 -rotate-45 translate-x-4 -translate-y-4 shadow-lg z-10" style={{ backgroundColor: driver.hex }}></div>}

                              {/* Foto Pilota */}
                              <div className={clsx(
                                "absolute right-0 bottom-0 transition-all duration-300 w-14 h-14 overflow-hidden pointer-events-none mask-image-gradient-b",
                                isSelected ? "opacity-100 mix-blend-normal" : "opacity-40 group-hover:opacity-60 mix-blend-screen"
                              )}>
                                {driver.img && (
                                  <img
                                    src={driver.img}
                                    alt={driver.name}
                                    className={clsx(
                                      "w-full h-full object-cover object-top filter transition-all duration-300",
                                      isSelected ? "grayscale-0 contrast-100" : "grayscale contrast-125"
                                    )}
                                  />
                                )}
                              </div>

                              <div className="relative z-10">
                                <div className="truncate group-hover:text-white transition-colors text-[11px]">{driver.name.split(' ').pop()}</div>
                                <div className="text-[9px] opacity-70 font-normal truncate mt-[1px]">{driver.team}</div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottone Invio Fisso in basso */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-f1-darker via-f1-darker to-transparent z-10 pointer-events-none">
                  <div className="max-w-md mx-auto pointer-events-auto">
                    <button
                      onClick={submitPredictions}
                      disabled={!currentRacePredictionsComplete || isSubmitting}
                      className={clsx(
                        "w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xl",
                        currentRacePredictionsComplete && !isSubmitting
                          ? "bg-f1-red text-white hover:bg-red-700 shadow-f1-red/30 hover:-translate-y-1 active:scale-95 cursor-pointer"
                          : "bg-white/5 text-zinc-600 cursor-not-allowed"
                      )}
                    >
                      {isSubmitting ? 'Salvataggio...' : 'Conferma Pronostico'}
                      {!isSubmitting && <CheckCircle2 className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </main>

    </div>
  );
}
