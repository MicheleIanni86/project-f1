import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { CheckCircle2, Clock3, Flag, LoaderCircle, LockKeyhole, UserRound, Users, X } from 'lucide-react';
import { DRIVERS } from './drivers';
import { CALENDAR_VERSION } from '../../shared/calendar.mjs';
import { api } from './api';
import { POSITIONS, EMPTY_PREDICTIONS, normalizePredictions, samePredictions, duplicatePodium, formatDate } from './race-view.mjs';
import { Notice, PredictionEditor, PredictionGrid, PlayersPredictions } from './components';

const dateTime = (value) => formatDate(value, { hour: '2-digit', minute: '2-digit' });

export default function RaceDialog({ race, currentUser, editable, onClose, closeGuard, onScoresChanged }) {
  const dialogRef = useRef(null);
  const [loaded, setLoaded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [draft, setDraft] = useState(EMPTY_PREDICTIONS);
  const [saved, setSaved] = useState(EMPTY_PREDICTIONS);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [confirmScores, setConfirmScores] = useState(false);
  const [view, setView] = useState('mine');
  const changed = !samePredictions(draft, saved);
  const hasSaved = POSITIONS.some(([key]) => saved[key]);
  const complete = POSITIONS.every(([key]) => draft[key]) && !duplicatePodium(draft);
  const canEdit = editable && !loading && !error && loaded?.lock?.isLocked === false && race.isOpen;
  const lockUnavailable = loaded && !loaded.lock;

  useEffect(() => {
    closeGuard.current = () => !busy && (!changed || window.confirm('Hai modifiche non salvate. Vuoi uscire senza salvarle?'));
    return () => { closeGuard.current = null; };
  }, [busy, changed, closeGuard]);

  useEffect(() => {
    if (!changed) return undefined;
    const warnBeforeLeaving = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [changed]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const focused = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = overflow; focused?.focus(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    Promise.all([
      api(`/race-predictions?raceId=${race.id}`, { signal: controller.signal }),
      api(`/race-lock?raceId=${race.id}`, { signal: controller.signal }).catch(() => null),
    ]).then(([data, lock]) => {
      if (controller.signal.aborted) return;
      if (data.warning) throw new Error('I pronostici non sono disponibili. Riprova prima di modificarli.');
      const own = normalizePredictions(data.predictions.find((entry) => entry.player === currentUser), DRIVERS);
      setLoaded({ predictions: data.predictions, lock }); setDraft(own); setSaved(own);
    }).catch((failure) => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [race.id, currentUser, retry]);

  async function save() {
    if (!canEdit || !complete || !changed || busy) return;
    setBusy(true); setNotice(null);
    try {
      await api('/submit-prediction', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ calendarVersion: CALENDAR_VERSION, user: currentUser, raceId: race.id, predictions: draft }) });
      setSaved({ ...draft });
      setLoaded((previous) => ({ ...previous, predictions: previous.predictions.map((entry) => entry.player === currentUser ? { ...entry, ...draft } : entry) }));
      setNotice({ type: 'success', text: 'Pronostico salvato. Le tue scelte sono nel foglio condiviso.' });
    } catch (failure) { setNotice({ type: 'error', text: `${failure.message} Le tue scelte restano qui: verifica e riprova.` }); }
    finally { setBusy(false); }
  }

  async function applyScores() {
    setBusy(true); setNotice(null);
    try {
      await api('/apply-race-scores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raceId: race.id, calendarVersion: CALENDAR_VERSION }) });
      setNotice({ type: 'success', text: 'Punteggi aggiornati nel foglio condiviso.' }); onScoresChanged();
    } catch (failure) { setNotice({ type: 'error', text: failure.message }); }
    finally { setBusy(false); setConfirmScores(false); }
  }

  return <dialog ref={dialogRef} className="race-dialog" aria-labelledby="race-dialog-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === dialogRef.current) onClose(); }}>
    <div className="dialog-shell"><header className="dialog-header"><div><span className="eyebrow">{race.isSprint ? 'WEEKEND SPRINT' : 'GRAN PREMIO'} · 2026</span><h2 id="race-dialog-title">{race.name}</h2><span className="dialog-date">{dateTime(race.raceStartsAt)} · Ora italiana</span></div><button className="icon-button close-dialog" aria-label="Chiudi gara" onClick={onClose} disabled={busy}><X size={22} /></button></header>
      <div className="dialog-body" aria-busy={loading}>
        <div className="session-strip"><span><Clock3 size={17} /><span>Qualifiche<strong>{dateTime(race.qualifyingStartsAt)}</strong></span></span><span><Flag size={17} /><span>{race.isSprint ? 'Sprint' : 'Gara'}<strong>{dateTime(race.raceStartsAt)}</strong></span></span></div>
        <div className="prediction-view-tabs" role="tablist" aria-label="Visualizzazione pronostici">
          <button type="button" role="tab" aria-selected={view === 'mine'} className={view === 'mine' ? 'active' : ''} onClick={() => setView('mine')}><UserRound size={17} /> Il mio pronostico{changed && <span className="unsaved-dot" aria-label="Modifiche non salvate" />}</button>
          <button type="button" role="tab" aria-selected={view === 'group'} className={view === 'group' ? 'active' : ''} onClick={() => setView('group')}><Users size={17} /> Il gruppo <span className="tab-count">{loaded?.predictions?.length || 0}</span></button>
        </div>
        {loading && <div className="loading-state" role="status"><LoaderCircle className="spin" size={24} /> Caricamento dei pronostici…</div>}
        {error && <Notice type="error" action={<button className="text-button" onClick={() => setRetry((n) => n + 1)}>Riprova</button>}>{error}</Notice>}
        {notice && <Notice type={notice.type}>{notice.text}</Notice>}
        {!loading && !error && <>
          {lockUnavailable && <Notice type="error" action={<button className="text-button" onClick={() => setRetry((n) => n + 1)}>Riprova</button>}>Non riesco a verificare la scadenza. I pronostici salvati sono visibili; la modifica sarà disponibile dopo la verifica.</Notice>}
          {view === 'mine' ? <>
            {canEdit ? <><div className="deadline-note"><Clock3 size={17} /> Puoi modificare fino al {dateTime(loaded.lock.lockAt)}.</div><PredictionEditor draft={draft} setDraft={setDraft} /></> : <>
              <div className="read-only-note"><LockKeyhole size={17} /><span>{race.done ? 'Gara conclusa. Ecco le scelte salvate.' : race.isLocked || race.isOngoing ? 'Pronostici chiusi. Le scelte salvate restano visibili.' : 'I pronostici si apriranno con il prossimo weekend disponibile.'}</span></div>
              {hasSaved ? <section><div className="section-heading"><h3>Il tuo pronostico</h3><span className="saved-label"><CheckCircle2 size={15} /> Salvato</span></div><PredictionGrid prediction={saved} /></section> : <div className="empty-own"><Flag size={21} /><span>Non hai ancora un pronostico per questa gara.</span></div>}
            </>}
            {currentUser === 'Michele' && race.done && <details className="admin-tools"><summary>Gestione punti <span>Admin</span></summary><p>Ricalcola i punti di questa gara dai risultati ufficiali. Questa operazione aggiorna il foglio condiviso.</p>{confirmScores ? <div className="admin-confirm"><p>Confermi il ricalcolo di {race.name}?</p><button className="secondary-button" onClick={() => setConfirmScores(false)} disabled={busy}>Annulla</button><button className="primary-button" onClick={applyScores} disabled={busy}>{busy ? 'Aggiornamento…' : 'Conferma ricalcolo'}</button></div> : <button className="secondary-button" onClick={() => setConfirmScores(true)}>Ricalcola punti gara</button>}</details>}
          </> : <PlayersPredictions predictions={loaded?.predictions || []} currentUser={currentUser} />}
        </>}
      </div>
      {canEdit && view === 'mine' && <footer className="dialog-footer"><span>{changed ? complete ? 'Tutte le scelte sono pronte.' : `${POSITIONS.filter(([key]) => draft[key]).length} di 4 scelte completate` : hasSaved ? 'Il tuo pronostico è salvato.' : 'Scegli poleman e podio.'}</span><button className="primary-button" disabled={!complete || !changed || busy} onClick={save}>{busy ? <LoaderCircle className="spin" size={18} /> : <CheckCircle2 size={18} />}{busy ? 'Salvataggio…' : hasSaved ? changed ? 'Salva modifiche' : 'Pronostico salvato' : 'Salva pronostico'}</button></footer>}
    </div>
  </dialog>;
}
RaceDialog.propTypes = { race: PropTypes.object.isRequired, currentUser: PropTypes.string.isRequired, editable: PropTypes.bool, onClose: PropTypes.func.isRequired, closeGuard: PropTypes.object.isRequired, onScoresChanged: PropTypes.func.isRequired };
