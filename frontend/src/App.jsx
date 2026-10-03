import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, Clock3, FileSpreadsheet, LogOut, Menu, RefreshCw, Trophy, X } from 'lucide-react';
import clsx from 'clsx';
import { api } from './api';
import { PLAYERS, buildRaces, filterRaces, editableWeekend, rankPlayers, formatDate } from './race-view.mjs';
import { Login, Notice, RaceCard, Standings, Status } from './components';
import RaceDialog from './RaceDialog';

const SHEET_URL = import.meta.env.VITE_SHARED_SHEET_URL || 'https://docs.google.com/spreadsheets/d/1wMlfyrE5eZKV18N6a5Dh-qH9ls0Nuhtdt-gBXHajPVs/edit?gid=0';
const dateTime = (value) => formatDate(value, { hour: '2-digit', minute: '2-digit' });
const timeOnly = (value) => formatDate(value, { day: undefined, month: undefined, hour: '2-digit', minute: '2-digit' });
const initialView = { tab: 'races', filter: null, raceId: null };

function savedUser() {
  try {
    const name = localStorage.getItem('f1nta-current-user');
    return PLAYERS.includes(name) ? name : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(savedUser);
  const [view, setView] = useState(initialView);
  const viewRef = useRef(view);
  const closeGuard = useRef(null);
  const [now, setNow] = useState(() => new Date());
  const [schedules, setSchedules] = useState({});
  const [standings, setStandings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [scheduleError, setScheduleError] = useState('');
  const [standingsError, setStandingsError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const races = useMemo(() => buildRaces(schedules, standings?.races, now), [schedules, standings, now]);
  const players = useMemo(() => rankPlayers(standings?.standings), [standings]);
  const weekend = editableWeekend(races);
  const activeRaces = filterRaces(races, 'ongoing');
  const filter = view.filter || (activeRaces.length ? 'ongoing' : 'upcoming');
  const visibleRaces = filterRaces(races, filter);
  const selectedRace = races.find((race) => race.id === view.raceId);
  const featured = activeRaces[0] || races.find((race) => !race.done);
  const ownStanding = players.find((player) => player.name === currentUser);

  useEffect(() => { viewRef.current = view; }, [view]);

  const navigate = useCallback((patch) => {
    const next = { ...viewRef.current, ...patch };
    if (viewRef.current.raceId && next.raceId !== viewRef.current.raceId && closeGuard.current && !closeGuard.current()) return;
    window.history.pushState({ f1ntaView: next }, '');
    viewRef.current = next;
    setView(next);
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    window.history.replaceState({ f1ntaView: initialView }, '');
    const pop = (event) => {
      const next = event.state?.f1ntaView || initialView;
      if (viewRef.current.raceId && next.raceId !== viewRef.current.raceId && closeGuard.current && !closeGuard.current()) {
        window.history.pushState({ f1ntaView: viewRef.current }, '');
        return;
      }
      viewRef.current = next;
      setView(next);
    };
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    const connection = () => setOnline(navigator.onLine);
    const focus = () => { setNow(new Date()); setRefreshKey((key) => key + 1); };
    window.addEventListener('online', connection);
    window.addEventListener('offline', connection);
    window.addEventListener('focus', focus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', connection);
      window.removeEventListener('offline', connection);
      window.removeEventListener('focus', focus);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setRefreshKey((key) => key + 1), 5 * 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const closeMenu = (event) => { if (!menuRef.current?.contains(event.target)) setMenuOpen(false); };
    const escape = (event) => { if (event.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('pointerdown', closeMenu);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', closeMenu);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.allSettled([
      api('/race-schedules', { signal: controller.signal }).then((data) => {
        if (controller.signal.aborted) return;
        setSchedules(Object.fromEntries(data.schedules.map((entry) => [entry.raceId, entry])));
        setScheduleError('');
      }).catch(() => {
        if (!controller.signal.aborted) setScheduleError('Calendario non aggiornato: mostriamo gli ultimi orari disponibili.');
      }),
      api('/standings', { signal: controller.signal }).then((data) => {
        if (controller.signal.aborted) return;
        setStandings(data);
        setStandingsError(data.warning ? 'La classifica potrebbe non essere aggiornata. Riprova tra poco.' : '');
        if (!data.warning) setUpdatedAt(new Date());
      }).catch(() => {
        if (!controller.signal.aborted) setStandingsError('Non riesco ad aggiornare la classifica. Riprova tra poco.');
      }),
    ]).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [refreshKey, online]);

  function login(name) {
    setCurrentUser(name);
    try { localStorage.setItem('f1nta-current-user', name); } catch { /* Sessione disponibile solo in memoria. */ }
  }

  function logout() {
    setCurrentUser(null);
    setMenuOpen(false);
    navigate(initialView);
    try { localStorage.removeItem('f1nta-current-user'); } catch { /* Archivio non disponibile. */ }
  }

  const openRace = (id) => navigate({ raceId: id });
  const refresh = () => setRefreshKey((key) => key + 1);

  return <div className="app">
    <a className="skip-link" href="#main-content">Vai al contenuto</a>
    <header className="app-header">
      <div className="header-inner">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); navigate({ ...initialView }); }} aria-label="F1NTA, pagina iniziale">
          <img src="/fanta-f1-logo.png" alt="" width="40" height="40" />
          <span><strong>FANTA F1<span className="brand-dot">!</span></strong><small>IL NOSTRO CAMPIONATO</small></span>
        </a>
        {currentUser && <nav className="desktop-nav" aria-label="Navigazione principale">
          <button aria-current={view.tab === 'races' ? 'page' : undefined} onClick={() => navigate({ tab: 'races', raceId: null })}>Calendario</button>
          <button aria-current={view.tab === 'standings' ? 'page' : undefined} onClick={() => navigate({ tab: 'standings', raceId: null })}>Classifica</button>
        </nav>}
        <div className="header-actions">
          <span className="season-badge">2026</span>
          {currentUser && <>
            <span className="user-pill"><span>{currentUser[0]}</span><strong>{currentUser}</strong></span>
            <div ref={menuRef} className="menu-wrap">
              <button className="icon-button" aria-label={menuOpen ? 'Chiudi menu' : 'Apri menu'} aria-expanded={menuOpen} aria-controls="account-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
              {menuOpen && <div className="account-menu panel" id="account-menu"><p>Il tuo paddock <strong>{currentUser}</strong></p><a href={SHEET_URL} target="_blank" rel="noreferrer"><FileSpreadsheet size={18} /> Foglio condiviso <ArrowRight size={15} /></a><button onClick={logout}><LogOut size={18} /> Esci dall’account</button></div>}
            </div>
          </>}
        </div>
      </div>
    </header>

    <main id="main-content" className="app-main">
      {!currentUser ? <Login onLogin={login} /> : <>
        {!online && <Notice type="error">Sei offline. Puoi consultare i dati già caricati; riconnettiti per aggiornare o salvare.</Notice>}
        <div className="page-heading">
          <div><span className="eyebrow">IL TUO PADDOCK · STAGIONE 2026</span><h2>{view.tab === 'races' ? 'Il weekend comincia qui.' : 'La corsa al titolo.'}</h2></div>
          <button className="icon-button refresh-button" onClick={refresh} disabled={loading} aria-label="Aggiorna calendario e classifica"><RefreshCw size={19} className={loading ? 'spin' : ''} /></button>
        </div>

        <div className={clsx('dashboard', view.tab === 'standings' && 'dashboard-standings')}>
          <div className="dashboard-main">
            {view.tab === 'races' ? <>
              {featured && <section className="featured-race panel">
                <div className="featured-top"><span className="eyebrow">{activeRaces.length ? 'QUESTO WEEKEND' : 'PROSSIMO APPUNTAMENTO'}</span><Status race={featured} editable={weekend.some((race) => race.id === featured.id)} /></div>
                <div className="featured-content"><div><span className="featured-type">FORMULA 1 {featured.isSprint ? 'SPRINT' : 'GRAND PRIX'}</span><h2>{featured.name.replace(' SPRINT', '')}</h2><p><CalendarDays size={17} />{formatDate(featured.raceStartsAt, { weekday: 'long' })}<span>·</span>{timeOnly(featured.raceStartsAt)}</p></div><div className="featured-number" aria-hidden="true">{formatDate(featured.raceStartsAt, { month: undefined, day: '2-digit' })}</div></div>
                <div className="featured-footer"><span><Clock3 size={15} /> {featured.isOpen ? `Pronostici entro ${dateTime(featured.lockStartsAt)}` : 'Le scelte del gruppo sono pronte da consultare'}</span><button className="primary-button" onClick={() => openRace(featured.id)}>{featured.isOpen ? 'Fai il tuo pronostico' : 'Vedi pronostici'}<ArrowRight size={17} /></button></div>
              </section>}

              <section className="calendar-section" aria-labelledby="calendar-title">
                <div className="section-heading"><div><span className="eyebrow">OGNI APPUNTAMENTO CONTA</span><h2 id="calendar-title">Calendario gare</h2></div><span className="timezone-note">Ora italiana</span></div>
                <div className="race-filters" aria-label="Filtra le gare">{[['ongoing', 'In corso'], ['upcoming', 'Prossime'], ['past', 'Passate']].map(([key, label]) => <button key={key} aria-pressed={filter === key} onClick={() => navigate({ filter: key })} className={clsx(filter === key && 'active')}>{label}<span>{filterRaces(races, key).length}</span></button>)}</div>
                <div className="list-heading"><span>{filter === 'past' ? 'Dalla più recente alla più lontana' : filter === 'ongoing' ? 'Il weekend in evidenza' : 'In ordine di partenza'}</span><span>{visibleRaces.length} eventi</span></div>
                {scheduleError && <Notice type="error" action={<button className="text-button" onClick={refresh}>Riprova</button>}>{scheduleError}</Notice>}
                <div className="race-list">{visibleRaces.map((race) => <RaceCard key={race.id} race={race} editable={weekend.some((entry) => entry.id === race.id)} onOpen={openRace} currentUser={currentUser} />)}</div>
                {!visibleRaces.length && <div className="empty-state panel"><CalendarDays size={30} /><h3>{filter === 'ongoing' ? 'Nessuna gara in corso' : filter === 'past' ? 'La stagione deve ancora iniziare' : 'Tutti gli appuntamenti sono conclusi'}</h3><p>{filter === 'ongoing' ? 'Il prossimo weekend ti aspetta nel calendario.' : 'Consulta le altre sezioni del calendario.'}</p><button className="secondary-button" onClick={() => navigate({ filter: filter === 'upcoming' ? 'past' : 'upcoming' })}>{filter === 'upcoming' ? 'Vedi gare passate' : 'Vedi prossime gare'}<ArrowRight size={16} /></button></div>}
              </section>
            </> : <section className="standings-panel panel">
              <div className="section-heading"><div><span className="eyebrow">CLASSIFICA MONDIALE</span><h2>Sei giocatori. Un titolo.</h2></div><Trophy className="gold" size={24} /></div>
              {standingsError && <Notice type="error" action={<button className="text-button" onClick={refresh}>Riprova</button>}>{standingsError}</Notice>}
              <Standings players={players} currentUser={currentUser} loading={loading} />
              <p className="standings-footnote">A parità di punti, la posizione in classifica è condivisa.</p>
            </section>}
          </div>

          <aside className="dashboard-aside">
            <section className="your-season panel"><span className="eyebrow">LA TUA STAGIONE</span><div className="your-season-name"><span className="player-avatar">{currentUser[0]}</span><h2>{currentUser}</h2><span className="you-tag">Tu</span></div><div className="season-stats"><div><strong>{ownStanding ? `${ownStanding.rank}°` : '—'}</strong><span>Posizione</span></div><div><strong>{ownStanding?.pointsTotal ?? '—'}</strong><span>Punti totali</span></div></div>{standingsError && <p className="helper-text">Dati in attesa di aggiornamento.</p>}</section>
            {view.tab === 'races' && <section className="mini-standings panel"><div className="section-heading"><h2>La classifica</h2><Trophy className="gold" size={19} /></div><Standings players={players} currentUser={currentUser} compact loading={loading} /><button className="text-button full-width" onClick={() => navigate({ tab: 'standings' })}>Classifica completa <ArrowRight size={16} /></button></section>}
            <section className="scoring-guide panel"><span className="eyebrow">COME SI FANNO PUNTI</span><h2></h2><dl><div><dt>Pole esatta</dt><dd>+2</dd></div><div><dt>Posizione esatta sul podio</dt><dd>+3</dd></div><div><dt>Sul podio, posizione diversa</dt><dd>+1</dd></div></dl><p></p></section>
          </aside>
        </div>

        <footer className="page-footer"><span>Fanta F1 - Michele Ianni</span><span>{updatedAt ? `Classifica aggiornata alle ${timeOnly(updatedAt)}` : 'Campionato 2026'}</span></footer>
      </>}
    </main>

    {currentUser && <nav className="mobile-nav" aria-label="Navigazione mobile"><button aria-current={view.tab === 'races' ? 'page' : undefined} onClick={() => navigate({ tab: 'races', raceId: null })}><CalendarDays size={21} /><span>Calendario</span></button><button aria-current={view.tab === 'standings' ? 'page' : undefined} onClick={() => navigate({ tab: 'standings', raceId: null })}><Trophy size={21} /><span>Classifica</span></button><a href={SHEET_URL} target="_blank" rel="noreferrer"><FileSpreadsheet size={21} /><span>Foglio</span></a></nav>}
    {currentUser && selectedRace && <RaceDialog key={selectedRace.id} race={selectedRace} currentUser={currentUser} editable={online && weekend.some((race) => race.id === selectedRace.id)} onClose={() => navigate({ raceId: null })} closeGuard={closeGuard} onScoresChanged={refresh} />}
  </div>;
}
