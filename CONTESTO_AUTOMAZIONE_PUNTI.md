# Contesto Automazione Punti

## Stato attuale

- Il progetto salva gia i pronostici nel Google Sheet condiviso tramite backend Cloudflare Worker.
- E stata aggiunta un'area test nel Google Sheet vicino alla legenda.
- L'area test viene popolata da un endpoint backend dedicato:
  - `POST /setup-test-area`
- L'endpoint legge:
  - pronostici e punteggi manuali dal Google Sheet
  - risultati ufficiali da OpenF1
- Poi scrive nel foglio un confronto `API vs manuale`.

## File toccati finora

- [backend/src/index.js](/C:/Users/Meeki/Desktop/ProgettiDev/project-f1/backend/src/index.js)
- [frontend/src/App.jsx](/C:/Users/Meeki/Desktop/ProgettiDev/project-f1/frontend/src/App.jsx)
- [AUTOMAZIONE_PUNTI_NOTE.md](/C:/Users/Meeki/Desktop/ProgettiDev/project-f1/AUTOMAZIONE_PUNTI_NOTE.md)
- [Formula F1NTA 2026.xlsx](/C:/Users/Meeki/Desktop/ProgettiDev/project-f1/Formula%20F1NTA%202026.xlsx)
- [scripts/update_excel_test_area.ps1](/C:/Users/Meeki/Desktop/ProgettiDev/project-f1/scripts/update_excel_test_area.ps1)

## Regola punti che oggi risulta coerente

Dai test fatti finora la regola che torna e:

- `Pole esatta = 2 punti`
- `Pilota in posizione esatta sul podio = 3 punti`
- `Pilota sul podio ma in posizione diversa = 1 punto`
- Il `3` della posizione esatta non si somma al `1` del podio

Formula logica:

- se indovini la pole: `+2`
- per ciascuno tra `1°`, `2°`, `3°`:
  - se indovini posizione esatta: `+3`
  - altrimenti, se quel pilota e comunque nel podio reale: `+1`

## Normalizzazione nomi piloti

Nel foglio ci sono nomi scritti in modi diversi, quindi nel calcolo bisogna normalizzare:

- sigle:
  - `RUS` -> `Russell`
  - `LEC` -> `Leclerc`
  - `PIA` -> `Piastri`
  - `VER` -> `Verstappen`
  - `HAM` -> `Hamilton`
  - `ANT` -> `Antonelli`
  - `NOR` -> `Norris`
- refusi gia visti:
  - `Russel` -> `Russell`
  - `Lecrerc` -> `Leclerc`

Questo e fondamentale, altrimenti i confronti con i dati API non tornano.

## Gare annullate

Sono state marcate come annullate nel codice:

- `BAHRAIN`
- `ARABIA SAUDITA`

Scelta fatta:

- mantenere gli stessi `id`
- non spostare la struttura del foglio
- non renderle giocabili
- non accettare pronostici su quelle gare

## Test reali fatti con OpenF1

### Australia

Risultato ufficiale ricavato da OpenF1:

- pole: `Russell`
- podio: `Russell`, `Antonelli`, `Leclerc`

Confronto con i punteggi manuali del foglio:

- Andrea `6` -> ok
- Giovanni `4` -> ok
- Luca `6` -> ok
- Marco `6` -> ok
- Michele `2` -> ok
- Salvo `3` -> ok

Esito:

- `AUSTRALIA = OK`

### Cina Sprint

Risultato ufficiale ricavato da OpenF1:

- pole: `Russell`
- podio: `Russell`, `Leclerc`, `Hamilton`

Confronto con i punteggi manuali del foglio:

- Andrea `6` -> ok
- Giovanni `4` -> ok
- Luca `6` -> ok
- Marco `6` -> ok
- Michele `5` API vs `4` manuale -> differenza
- Salvo `4` -> ok

Esito:

- `CINA SPRINT = DIFF`

Nota importante:

- ad oggi l'unico mismatch emerso nei test reali e `Michele` sulla `CINA SPRINT`
- va chiarito se:
  - il punteggio manuale e sbagliato
  - oppure esiste una regola speciale non ancora formalizzata

### Cina

Risultato ufficiale ricavato da OpenF1:

- pole: `Antonelli`
- podio: `Antonelli`, `Russell`, `Hamilton`

Confronto con i punteggi manuali del foglio:

- tutti hanno `2`
- il calcolo API torna con `2` per tutti

Esito:

- `CINA = OK`

## Situazione confronto complessivo al 16 marzo 2026

Le gare gia confrontate perche hanno punteggi manuali nel foglio sono:

1. `AUSTRALIA` -> `OK`
2. `CINA SPRINT` -> `DIFF`
3. `CINA` -> `OK`

Quindi:

- la logica generale sembra giusta
- resta da chiarire solo `CINA SPRINT / Michele`

## Area test nel Google Sheet

Posizione:

- vicino alla legenda
- range attuale scritto dal backend: `Foglio1!X11:AO16`

Contenuto:

- nome gara
- pole e podio API
- per ogni giocatore:
  - punteggio calcolato API
  - punteggio manuale foglio
- colonna finale:
  - `OK`
  - `DIFF`

## Endpoint backend aggiunto

Endpoint disponibile sul Worker:

- `POST /setup-test-area`

Cosa fa:

1. legge dal Google Sheet solo le gare che hanno gia punteggio manuale compilato
2. interroga OpenF1 per ottenere pole e podio ufficiali
3. calcola i punteggi secondo la regola attuale
4. scrive il confronto nel foglio

## Limitazioni attuali

- L'endpoint oggi confronta solo le gare che hanno gia un punteggio manuale nella riga punteggi del foglio.
- Non scrive ancora i punteggi ufficiali nella tabella principale del fantagioco.
- Non aggiorna ancora automaticamente la classifica generale.
- Non gestisce ancora un report dettagliato del tipo:
  - `pole esatta`
  - `1° esatto`
  - `2° sul podio`
  - ecc.

## Decisioni tecniche gia prese

- Il confronto con OpenF1 va fatto lato backend, non con formule nel Google Sheet.
- Le formule nel foglio Google hanno creato problemi di parsing/locale, quindi per il test si scrivono direttamente i valori calcolati.
- Per i confronti bisogna sempre normalizzare i nomi piloti letti dal foglio.

## Prossimi step consigliati

1. Analizzare il caso `CINA SPRINT / Michele` e decidere se il manuale e sbagliato o se esiste una regola speciale.
2. Se il caso viene chiarito, congelare ufficialmente la regola punteggio.
3. Creare una funzione unica di scoring backend riutilizzabile.
4. Scrivere i punteggi automatici nella tabella principale del foglio, non solo nell'area test.
5. Aggiornare automaticamente classifica e totale.

## Riassunto breve

- Automazione test con API: fatta
- Confronto con foglio: fatto
- Gare annullate Bahrain/Arabia: gestite
- Regola generale: praticamente confermata
- Problema aperto: solo `CINA SPRINT / Michele`
