# Automazione Punti - Note Aperte

## Stato attuale

- Lock pronostici dopo qualifiche: implementato usando OpenF1.
- Classifica e pronostici: in parte letti dal foglio condiviso.
- Automazione calcolo punti: da definire con regole finali condivise con i giocatori.

## Dubbi da chiarire

- `Posizione podio esatta, 3 punti` non si somma a `Sul podio, 1 punto`: dai punti fatti a mano in Australia risulta che lo sostituisce.
- `Posizione finale esatta, 5 punti` si somma anche a `Sul podio finale, 3 punti` oppure lo sostituisce?
- `Costruttore esatto, 5 punti` a cosa si riferisce esattamente:
  - costruttore del vincitore
  - costruttore della pole
  - previsione separata non ancora presente nel form
- Sprint e gara lunga devono avere regole identiche oppure diverse?
- I punti classifica totale devono aggiornare solo la gara appena conclusa o anche ricalcolare tutto da zero ogni volta?

## Regola punteggio dedotta dai dati manuali

- Analizzando i punteggi inseriti a mano per `AUSTRALIA`:
  - `Pole esatta = 2 punti`
  - `Pilota in posizione podio esatta = 3 punti`
  - `Pilota sul podio ma in posizione diversa = 1 punto`
  - il `3 punti` della posizione esatta sostituisce il `1 punto` del podio, non si sommano
- L'unico ordine d'arrivo che torna con tutti i punteggi manuali del blocco Australia e con i pronostici salvati e:
  - Pole: `Russell`
  - Gara: `Russell`, `Antonelli`, `Leclerc`
- Verifica rapida:
  - `Andrea = 6` -> `pole esatta (2)` + `1° esatto Russell (3)` + `Leclerc sul podio (1)`
  - `Michele = 2` -> `Leclerc sul podio (1)` + `Russell sul podio (1)`
  - `Salvo = 3` -> `Leclerc 3° esatto (3)`

## Gare annullate

- `BAHRAIN` e `ARABIA SAUDITA` vanno trattate come gare annullate.
- Conviene mantenerle con lo stesso `id` nel codice e nel foglio, ma marcarle come annullate:
  - non compaiono tra le gare giocabili
  - non accettano pronostici
  - non spostano le righe successive del Google Sheet

## API / Dati esterni

- OpenF1 funziona per recuperare data e ora qualifiche.
- Test eseguito sulla prossima gara:
  - `Japan Qualifying`
  - `date_start`: `2026-03-28T06:00:00+00:00`
  - `date_end`: `2026-03-28T07:00:00+00:00`
- Test sprint qualifying per il Giappone:
  - nessun risultato, coerente con gara non sprint.

## Step futuri suggeriti

1. Congelare le regole punteggio finali.
2. Formalizzarle in una funzione unica di scoring.
3. Recuperare risultati ufficiali gara/qualifica via API.
4. Calcolare i punti automaticamente per ogni giocatore.
5. Scrivere i risultati nel foglio/classifica.
