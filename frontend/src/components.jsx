import { useState } from 'react';
import PropTypes from 'prop-types';
import { ArrowRight, Check, CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff, Flame, Flag, Search, Trophy, Users } from 'lucide-react';
import clsx from 'clsx';
import { DRIVERS } from './drivers';
import { PLAYERS, POSITIONS, normalizePredictions, formatDate, raceStatus } from './race-view.mjs';

export function Notice({ children, type = 'info', action }) {
  return <div className={clsx('notice', `notice-${type}`)} role={type === 'error' ? 'alert' : 'status'}><span>{children}</span>{action}</div>;
}
Notice.propTypes = { children: PropTypes.node, type: PropTypes.string, action: PropTypes.node };

export function Status({ race, editable }) {
  const status = raceStatus(race, editable);
  return <span className={`status status-${status.tone}`}><span className="status-dot" />{status.label}</span>;
}
Status.propTypes = { race: PropTypes.object.isRequired, editable: PropTypes.bool };

export function Login({ onLogin }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  function submit(event) {
    event.preventDefault();
    if (!name || password.trim().toLowerCase() !== name.toLowerCase()) {
      setError('Nome o password non corretti. Controlla e riprova.'); return;
    }
    onLogin(name);
  }
  return <section className="login-layout">
    <div className="login-intro"><span className="eyebrow"><span className="red-line" /> STAGIONE 2026</span><h2>La tua griglia.<br />La tua <em>sfida.</em></h2><p>Ogni weekend, una nuova occasione. Scegli i tuoi piloti e segui la corsa al titolo con il tuo gruppo.</p><div className="login-facts"><span><Users size={18} /> 6 giocatori</span><span><Flag size={18} /> Un solo campionato</span></div></div>
    <div className="login-card panel"><span className="eyebrow">BENVENUTO NEL PADDOCK</span><h3>Entra in F1NTA</h3><p>Accedi per ritrovare i tuoi pronostici.</p>
      <form onSubmit={submit} className="login-form">
        <label htmlFor="login-name">Il tuo nome</label><select id="login-name" autoComplete="username" value={name} onChange={(event) => { setName(event.target.value); setError(''); }} required><option value="" disabled>Seleziona il tuo nome</option>{PLAYERS.map((player) => <option key={player}>{player}</option>)}</select>
        <label htmlFor="login-password">Password</label><div className="password-field"><input id="login-password" type={visible ? 'text' : 'password'} autoComplete="current-password" autoCapitalize="none" spellCheck={false} value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} required aria-invalid={Boolean(error)} aria-describedby={error ? 'login-error' : undefined} /><button type="button" className="icon-button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Nascondi password' : 'Mostra password'}>{visible ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
        {error && <p id="login-error" className="field-error" role="alert">{error}</p>}
        <button className="primary-button" type="submit">Entra nel paddock <ArrowRight size={18} /></button>
      </form>
    </div>
  </section>;
}
Login.propTypes = { onLogin: PropTypes.func.isRequired };

export function RaceCard({ race, editable, onOpen, currentUser }) {
  const points = race.points[currentUser];
  const dateTime = (date) => formatDate(date, { hour: '2-digit', minute: '2-digit' });
  return <button className="race-card panel" onClick={() => onOpen(race.id)} aria-label={`Apri ${race.name}`}>
    <div className="race-date"><span>{formatDate(race.raceStartsAt, { day: undefined, month: 'short' })}</span><strong>{formatDate(race.raceStartsAt, { day: '2-digit', month: undefined })}</strong><small>{formatDate(race.raceStartsAt, { day: undefined, month: undefined, weekday: 'short' })}</small></div>
    <div className="race-card-content"><div className="race-card-title"><h3>{race.name.replace(' SPRINT', '')}</h3>{race.isSprint && <span className="sprint-tag"><Flame size={12} /> Sprint</span>}</div>
      <div className="race-times"><span><span>Qualifica</span>{dateTime(race.qualifyingStartsAt)}</span><span><span>{race.isSprint ? 'Sprint' : 'Gara'}</span>{dateTime(race.raceStartsAt)}</span></div>
      <div className="race-card-bottom"><Status race={race} editable={editable} />{race.done && points !== undefined && <span className="race-points">{points} <small>punti</small></span>}</div>
    </div><ChevronRight className="race-arrow" size={19} />
  </button>;
}
RaceCard.propTypes = { race: PropTypes.object.isRequired, editable: PropTypes.bool, onOpen: PropTypes.func.isRequired, currentUser: PropTypes.string };

export function Standings({ players, currentUser, compact = false, loading = false }) {
  if (loading && !players.length) return <div className="skeleton-stack" aria-label="Caricamento classifica" role="status">{[0, 1, 2].map((n) => <div className="skeleton" key={n} />)}</div>;
  if (!players.length) return <div className="empty-state"><Trophy size={28} /><h3>Classifica non disponibile</h3><p>Riprova tra poco per vedere i punti del gruppo.</p></div>;
  return <ol className={clsx('standings-list', compact && 'standings-compact')}>{players.map((player) => {
    const isYou = player.name === currentUser;
    const tied = players.filter((entry) => entry.rank === player.rank).length > 1;
    return <li key={player.name} className={clsx('standing-row', isYou && 'standing-you', player.rank === 1 && 'standing-leader')}><span className="standing-rank">{String(player.rank).padStart(2, '0')}</span><span className="player-avatar">{player.name[0]}</span><div className="standing-person"><strong>{player.name} {isYou && <small>Tu</small>}</strong><span>{tied ? 'Pari merito' : player.rank === 1 ? 'In testa al campionato' : `${players[0].pointsTotal - player.pointsTotal} punti dalla vetta`}</span></div><div className="standing-points"><strong>{player.pointsTotal}</strong><small>PT</small></div></li>;
  })}</ol>;
}
Standings.propTypes = { players: PropTypes.array.isRequired, currentUser: PropTypes.string, compact: PropTypes.bool, loading: PropTypes.bool };

function DriverTile({ value, label }) {
  const id = normalizePredictions({ pole: value }, DRIVERS).pole;
  const driver = DRIVERS.find((entry) => entry.id === id);
  return <div className="prediction-tile" style={{ '--team-color': driver?.hex || '#50545c' }}><span className="prediction-label">{label}</span><div className="prediction-driver">{driver && <img src={driver.img} alt="" loading="lazy" width="52" height="52" />}<div><strong>{driver?.name.split(' ').pop() || value || 'Non inserito'}</strong><small>{driver?.team || (value ? 'Scelta salvata' : 'Nessuna scelta')}</small></div></div></div>;
}
DriverTile.propTypes = { value: PropTypes.string, label: PropTypes.string.isRequired };

export function PredictionGrid({ prediction }) {
  return <div className="prediction-grid">{POSITIONS.map(([key, label]) => <DriverTile key={key} label={label} value={prediction?.[key]} />)}</div>;
}
PredictionGrid.propTypes = { prediction: PropTypes.object };

export function PlayersPredictions({ predictions, currentUser }) {
  const [activePlayer, setActivePlayer] = useState(currentUser);
  const selected = predictions.find((entry) => entry.player === activePlayer) || predictions[0];
  const index = predictions.indexOf(selected);
  return <section className="players-board"><div className="section-heading"><div><span className="eyebrow">IL GRUPPO</span><h3>I pronostici di tutti</h3></div><Users size={20} /></div>
    <div className="player-tabs" aria-label="Scegli un giocatore">{predictions.map((entry) => <button key={entry.player} aria-pressed={selected?.player === entry.player} onClick={() => setActivePlayer(entry.player)} className={clsx(selected?.player === entry.player && 'active')}>{entry.player}{entry.player === currentUser && <small>Tu</small>}</button>)}</div>
    {selected && <><PredictionGrid prediction={selected} /><div className="player-paging"><button className="text-button" disabled={index <= 0} onClick={() => setActivePlayer(predictions[index - 1].player)}><ChevronLeft size={17} /> Precedente</button><span>{index + 1} / {predictions.length}</span><button className="text-button" disabled={index >= predictions.length - 1} onClick={() => setActivePlayer(predictions[index + 1].player)}>Successivo <ChevronRight size={17} /></button></div></>}
  </section>;
}
PlayersPredictions.propTypes = { predictions: PropTypes.array.isRequired, currentUser: PropTypes.string.isRequired };

export function PredictionEditor({ draft, setDraft }) {
  const [position, setPosition] = useState('pole');
  const [query, setQuery] = useState('');
  const drivers = DRIVERS.filter((driver) => `${driver.name} ${driver.team} ${driver.id}`.toLowerCase().includes(query.toLowerCase()));
  const selected = DRIVERS.find((driver) => driver.id === draft[position]);
  function select(driverId) {
    setDraft((previous) => ({ ...previous, [position]: driverId }));
    const nextIndex = POSITIONS.findIndex(([key]) => key === position) + 1;
    if (nextIndex < POSITIONS.length) setPosition(POSITIONS[nextIndex][0]);
    setQuery('');
  }
  return <section className="prediction-editor"><div className="section-heading"><div><span className="eyebrow">LE TUE SCELTE</span><h3>Componi il pronostico</h3></div><span className="completion-count">{POSITIONS.filter(([key]) => draft[key]).length} / 4</span></div>
    <div className="position-tabs" aria-label="Posizione da pronosticare">{POSITIONS.map(([key, label]) => <button key={key} className={clsx(position === key && 'active', draft[key] && 'filled')} onClick={() => { setPosition(key); setQuery(''); }} aria-pressed={position === key}><span>{label}</span><strong>{draft[key] || 'Scegli'}</strong>{draft[key] && <Check size={13} />}</button>)}</div>
    <div className="driver-picker-heading"><h4>{POSITIONS.find(([key]) => key === position)[1]}</h4><span>{selected ? `Scelto: ${selected.name.split(' ').pop()}` : 'Tocca un pilota'}</span></div>
    <label className="search-field"><Search size={18} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cerca pilota o scuderia" aria-label="Cerca pilota o scuderia" autoComplete="off" /></label>
    <div className="driver-grid">{drivers.map((driver) => {
      const isSelected = draft[position] === driver.id;
      const used = position !== 'pole' && !isSelected && ['first', 'second', 'third'].some((key) => draft[key] === driver.id);
      return <button key={driver.id} onClick={() => select(driver.id)} disabled={used} aria-pressed={isSelected} aria-label={`${driver.name}, ${driver.team}${used ? ', già sul podio' : ''}`} className={clsx('driver-option', isSelected && 'selected')} style={{ '--team-color': driver.hex }}><img src={driver.img} alt="" loading="lazy" width="60" height="68" /><span><strong>{driver.name.split(' ').pop()}</strong><small>{used ? 'Già sul podio' : driver.team}</small></span>{isSelected && <CheckCircle2 size={17} />}</button>;
    })}</div>{!drivers.length && <p className="empty-search">Nessun pilota trovato. Prova un altro nome.</p>}
    <p className="helper-text">Scegli tre piloti diversi per il podio. Il poleman può essere anche sul podio.</p>
  </section>;
}
PredictionEditor.propTypes = { draft: PropTypes.object.isRequired, setDraft: PropTypes.func.isRequired };
