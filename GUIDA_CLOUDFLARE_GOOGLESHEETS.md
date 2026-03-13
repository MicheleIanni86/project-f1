## Guida: usare il Google Sheet come “database” e deploy su Cloudflare

Questa guida spiega, passo–passo, come:

- usare **solo** il Google Sheet `Formula F1NTA 2026` come “database”;
- far sì che il **backend (Worker)** legga/scriva lì dentro;
- calcolare **tutti i punteggi via codice**, senza formule nel foglio;
- pubblicare frontend + backend su **Cloudflare Pages + Workers**.

---

### 1. Regole di punteggio (come in colonna X del foglio)

Useremo queste regole, tutte implementate nel backend:

- **Pole position esatta**: +2 punti  
- **Posizione podio esatta (gara)**: +3 punti  
- **Sul podio (ma posizione diversa)**: +1 punto  
- **Posizione finale esatta in classifica mondiale**: +5 punti  
- **Sul podio finale (ma posizione diversa)**: +3 punti  
- **Costruttori esatto**: +5 punti  

L’idea:

- Per ogni **gara** (AUSTRALIA, CINA SPRINT, …) confrontiamo i pronostici (Pole, 1°, 2°, 3°) con **i risultati ufficiali presi via API F1**, non scritti a mano.
- Per il **campionato** (blocco rosso “Campionato” a destra) confrontiamo i pronostici di metà stagione con la classifica finale (presa anche questa da API oppure inserita nel foglio).

---

### 2. Come mappiamo l’app sul foglio

Usiamo il foglio `Foglio1` del documento `Formula F1NTA 2026`.

#### 2.1. Colonne dei giocatori

Nella riga 2 vedi:

- `C`: **Andrea**  
- `D`: **Giovanni**  
- `E`: **Luca**  
- `F`: **Marco**  
- `G`: **Michele**  
- `H`: **Salvo**  

Nel backend avremo una mappa:

```js
const PLAYER_COLUMNS = {
  Andrea: "C",
  Giovanni: "D",
  Luca: "E",
  Marco: "F",
  Michele: "G",
  Salvo: "H",
};
```

#### 2.2. Blocchi di righe per gara

Esempio AUSTRALIA (come si vede nello Sheet):

- riga 3: `AUSTRALIA` / `Poleman` / pronostici pole (C–H)  
- riga 4: `1°` / pronostici 1° posto  
- riga 5: `07 MAR 06:00` / `2°` / pronostici 2° posto  
- riga 6: `3°` / pronostici 3° posto  

Ogni gara userà **4 righe consecutive**. Nel backend terremo una tabella:

```js
const RACE_BLOCKS = {
  1: { name: "AUSTRALIA", rows: { pole: 3, first: 4, second: 5, third: 6 } },
  2: { name: "CINA SPRINT", rows: { pole: 7, first: 8, second: 9, third: 10 } },
  3: { name: "CINA", rows: { pole: 11, first: 12, second: 13, third: 14 } },
  // …e così via per tutte le gare
};
```

Quando l’utente manda un pronostico dall’app:

- `raceId` → scegliamo il blocco giusto.  
- `position` (`pole`, `first`, `second`, `third`) → scegliamo la riga giusta.  
- `user` → scegliamo la colonna giusta (C–H).  
- Valore cella = nome del pilota scelto (es. "Russell").

#### 2.3. Da dove arrivano i risultati veri (non scritti a mano)

Per i risultati **qualifiche/gara** NON useremo il foglio, ma un’API esterna di F1:

- Useremo, ad esempio, `f1api.dev`:
  - endpoint tipo `GET https://f1api.dev/api/current/last/race` (vedi [docs risultati gara](https://f1api.dev/docs/results/current-race)),
  - o endpoint per una gara specifica dell’anno (`season` + `round` / `raceId`).
- Il backend mapperà ognuna delle tue gare (`raceId` 1 = AUSTRALIA, 2 = CINA SPRINT, ecc.) su:
  - `season` (2026),
  - `round` oppure `raceId` dell’API.
- La funzione concettuale sarà:

```js
// ESEMPIO CONCETTUALE, non definitivo
async function fetchOfficialResults(raceMeta) {
  // raceMeta = { season: 2026, round: 1, sprint: false, raceIdApi: 'australia_2026' }
  const url = `https://f1api.dev/api/${raceMeta.season}/races/${raceMeta.round}/race`;
  const res = await fetch(url);
  const data = await res.json();

  // Estrai ordine d'arrivo e pole:
  const results = data.races.results; // array con { position, driver: { surname, shortName } ... }
  const raceOrder = results.sort((a, b) => a.position - b.position);

  return {
    pole: raceOrder.find(d => d.grid === 1)?.driver.surname ?? null,
    first: raceOrder[0]?.driver.surname ?? null,
    second: raceOrder[1]?.driver.surname ?? null,
    third: raceOrder[2]?.driver.surname ?? null,
  };
}
```

> Nota: l’URL esatto/parametri possono cambiare, vanno presi dalla documentazione aggiornata di `f1api.dev`. L’importante è che il Worker, a partire da `raceId`, riesca a ottenere `pole/1°/2°/3°` ufficiali senza che nessuno debba scriverli nel foglio.

#### 2.4. Campionato (pronostici mondiali)

Useremo il blocco “Campionato” (colonne Q–V) in basso a destra:

- riga “1° / 2° / 3° / Costruttori” → pronostici campionato per ogni giocatore.  
- un blocco separato (es. foglio `Classifica Finale`) con:
  - classifica finale piloti (1°, 2°, 3°),
  - costruttore campione.

Il backend, a fine campionato, farà:

- per ogni giocatore:
  - confronta i 3 pronostici con i primi 3 reali:
    - stessa posizione → +5 punti  
    - in top 3 ma posizione diversa → +3  
  - confronta costruttore → +5 se esatto.

---

### 3. Backend su Cloudflare Worker (concetto)

Il Worker farà due cose:

#### 3.1. `POST /submit-prediction`

Input JSON dall’app:

```json
{
  "user": "Andrea",
  "raceId": 1,
  "predictions": {
    "pole": "Russell",
    "first": "Russell",
    "second": "Leclerc",
    "third": "Verstappen"
  }
}
```

Passi nel Worker:

1. Validare `user`, `raceId`, `predictions`.  
2. Per ogni campo (`pole`, `first`, `second`, `third`):
   - usare `RACE_BLOCKS[raceId].rows[position]` per capire **la riga**.  
   - usare `PLAYER_COLUMNS[user]` per capire **la colonna**.  
   - fare una chiamata **Google Sheets API** `spreadsheets.values.update` verso l’intervallo, es:  
     - `Foglio1!C3` (Andrea, AUSTRALIA, Pole).  
3. Restituire `{ success: true }`.

#### 3.2. `GET /standings`

Passi nel Worker:

1. Leggere **tutti i pronostici** delle gare terminate:
   - con `spreadsheets.values.get` sugli intervalli dei blocchi di righe (es. `Foglio1!A3:H14`).
2. Per ogni gara:
   - usare la mappa `RACE_BLOCKS` per sapere `season/round/raceIdApi`,
   - chiamare `fetchOfficialResults(raceMeta)` (API F1) per ottenere:
     - `pole`, `first`, `second`, `third` ufficiali.
3. Applicare le regole di punteggio (sezione 1) in JavaScript:
   - per ogni gara e giocatore confrontare:
     - pronostici di qualifica vs `pole` ufficiale,
     - pronostici di gara vs ordine d’arrivo ufficiale (`first/second/third`),
   - sommare i punti gara.
4. Leggere il blocco dei **pronostici mondiali** dal foglio e la **classifica finale reale**:
   - la classifica finale può arrivare:
     - o da un altro endpoint di `f1api.dev` (classifica finale piloti/costruttori),
     - o da un secondo foglio manuale (`Classifica Finale`).
   - applicare le regole campionato (posizione finale esatta, sul podio finale, costruttori).  
5. Costruire un JSON tipo:

```json
{
  "players": ["Andrea", "Giovanni", "Luca", "Marco", "Michele", "Salvo"],
  "standings": [
    { "name": "Andrea", "pointsTotal": 42 },
    { "name": "Giovanni", "pointsTotal": 37 },
    ...
  ],
  "races": [
    {
      "id": 1,
      "name": "AUSTRALIA",
      "points": {
        "Andrea": 6,
        "Giovanni": 4,
        ...
      }
    }
  ],
  "championship": {
    "totals": {
      "Andrea": 10,
      ...
    }
  }
}
```

L’app React userà questo JSON per popolare la tab “Classifica”.

---

### 4. Setup Google (una volta sola)

1. Vai su **Google Cloud Console**.  
2. Crea un **nuovo progetto** (es. `fanta-f1-2026`).  
3. Vai su **APIs & Services → Library**:
   - cerca **“Google Sheets API”**,
   - clicca **Enable**.
4. Vai su **APIs & Services → Credentials**:
   - clicca **Create Credentials → Service account**,
   - dagli un nome (es. `fanta-f1-service`),
   - completa la creazione (ruolo base `Editor` va bene).  
5. Dentro il service account, scheda **Keys**:
   - `Add key → Create new key → JSON`,
   - scarica il file `.json` (contiene `client_email`, `private_key`, ecc.).
6. Apri il tuo Google Sheet `Formula F1NTA 2026`  
   - clicca su **Condividi**,  
   - aggiungi l’**email del service account** (es. `fanta-f1-service@…gserviceaccount.com`) con permesso **Editor**.

Da ora, quel service account può leggere/scrivere il file.

---

### 5. Configurare il Worker con Wrangler

Nella cartella `backend`:

1. Crea (se non c’è) un file `wrangler.toml` simile:

```toml
name = "fanta-f1-backend"
main = "src/index.js"
compatibility_date = "2025-01-01"

[vars]
SHEET_ID = "1wMlfyrE5eZKV18N6a5Dh-qH9ls0Nuhtdt-gBXHajPVs"
```

2. Aggiungi la secret con il JSON del service account:

```bash
cd backend
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
```

Incolla **tutto il contenuto del file JSON** del service account quando lo richiede.

3. Nel codice `backend/src/index.js` userai:

```js
const { SHEET_ID, GOOGLE_SERVICE_ACCOUNT_JSON } = env;
```

e con quella JSON costruirai un **JWT** per autenticarti contro le Google Sheets API (con `fetch` dal Worker).

4. Per test locale:

```bash
cd backend
npx wrangler dev
```

---

### 6. Deploy del frontend su Cloudflare Pages

1. Fai push del repo su GitHub (se non è già collegato).  
2. Su Cloudflare → **Pages** → **Create project**:
   - scegli il repo `project-f1`,
   - framework: **Vite**,
   - comando build: `npm run build` dentro `frontend`,
   - directory di output: `frontend/dist`.
3. Nelle **Environment variables** di Pages:

   - `VITE_API_BASE_URL` = URL del Worker, es. `https://fanta-f1-backend.your-account.workers.dev`

4. Deploy: Pages lancerà build e pubblicherà il frontend.

---

### 7. Flusso finale per l’utente

1. L’utente apre l’app su `https://tuo-progetto.pages.dev`.  
2. Seleziona il proprio nome, sceglie la gara, apre il pronostico, seleziona i piloti e clicca **Conferma Pronostico**.  
3. Il frontend chiama `POST /submit-prediction` sul Worker.  
4. Il Worker scrive nel Google Sheet `Formula F1NTA 2026` nelle celle giuste.  
5. Quando vuoi vedere la classifica:
   - l’app chiama `GET /standings`,
   - il Worker legge pronostici + risultati dallo Sheet,
   - calcola i punti con le regole della colonna X,
   - ritorna la classifica aggiornata.

In questo modo:

- il **Google Sheet rimane l’unico database**, condiviso con tutti;
- non hai bisogno di nessun altro DB;
- puoi cambiare gare, testi, colori direttamente nel foglio;
- tutta la logica di calcolo è nel backend, versionata su Git.

