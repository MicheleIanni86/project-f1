# Automazione Punti - Note Aperte

## Stato attuale

- Lock pronostici dopo qualifiche: implementato usando OpenF1.
- Classifica e pronostici: in parte letti dal foglio condiviso.
- Automazione calcolo punti: da definire con regole finali condivise con i giocatori.

## Dubbi da chiarire

- `Posizione podio esatta, 3 punti` si somma anche a `Sul podio, 1 punto` oppure lo sostituisce?
- `Posizione finale esatta, 5 punti` si somma anche a `Sul podio finale, 3 punti` oppure lo sostituisce?
- `Costruttore esatto, 5 punti` a cosa si riferisce esattamente:
  - costruttore del vincitore
  - costruttore della pole
  - previsione separata non ancora presente nel form
- Sprint e gara lunga devono avere regole identiche oppure diverse?
- I punti classifica totale devono aggiornare solo la gara appena conclusa o anche ricalcolare tutto da zero ogni volta?

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
