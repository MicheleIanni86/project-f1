# Correzione calendario del 3 ottobre 2026

## Dati esistenti

Gli ID 1–31 identificano i blocchi del foglio e non sono numeri di round F1.
La formula delle righe rimane `3 + (id - 1) * 4`. Nessuna cella, formula,
classifica o previsione viene migrata dalla correzione.

La lettura diretta delle etichette del foglio, confermata da Michele, identifica:

| ID | Righe | Evento |
| --- | --- | --- |
| 5 | 19–22 | Bahrain di aprile, annullato e vuoto |
| 23 | 91–94 | Bahrain in Malaysia, sei pronostici già presenti |
| 24 | 95–98 | Singapore Sprint, vuoto |
| 25 | 99–102 | Singapore gara, vuoto |
| 26–31 | 103–126 | USA, Messico, Brasile, Las Vegas, Qatar, Abu Dhabi |

Il codice precedente ometteva il nuovo blocco Bahrain e attribuiva il blocco 23
a Singapore Sprint. Le etichette del codice erano sbagliate, non le celle del foglio.
La correzione conserva integralmente i sei pronostici nelle righe 91–94, associando
quel blocco alla gara effettiva. Non occorre nessuna migrazione dei dati.
Una copia delle risposte lette è conservata in `.local-backups/`, esclusa da Git.

## Calendario e orari

- Un unico elenco in `shared/races-2026.json`, con ID dei blocchi e orari ISO UTC.
- Bahrain in Malaysia usa ID 23; Singapore Sprint/Gara usano 24/25.
- I blocchi storici 1–22 restano invariati, comprese le due cancellazioni di aprile.
- Le etichette reali vengono verificate prima di leggere i pronostici o scrivere
  pronostici/punti: un futuro disallineamento del foglio blocca l'operazione.
- Le vecchie pagine aperte devono essere ricaricate prima di salvare: una versione
  del calendario nella richiesta evita scritture con gli abbinamenti precedenti.
- La ricerca Jolpi usa stagione e circuito; il round proviene dalla risposta.
- Le risposte dei risultati sono controllate per stagione, circuito e data.
- La cache Jolpi scade dopo cinque minuti e non conserva gli errori di rete.
- `/race-schedules` fornisce tutti gli orari usando un'unica lettura del calendario.
- Il frontend ordina per data effettiva, anche per le gare riprogrammate.
- La chiusura resta a sette ore dall'inizio qualifiche (durata stimata di un'ora
  più sei ore), senza superare l'inizio gara. Il vecchio blocco anticipato basato
  sulla data statica è eliminato. Orari ufficiali incompleti bloccano il salvataggio.
- I fallback hanno orari espliciti; non si inventa più la gara aggiungendo un giorno
  alle qualifiche. Giorni e visualizzazione sono riferiti a Europe/Rome.
- Il calcolo automatico aspetta almeno 24 ore dall'inizio effettivo della sessione.
  Le formule dei punteggi e gli indirizzi di scrittura rimangono invariati.

## Verifiche

`npm test --prefix backend` verifica indirizzi del foglio, confini temporali,
rinumerazione dei round, cache e rifiuto di risultati di un altro evento.
`npm run build --prefix frontend` verifica la build.
Il lint frontend contiene errori preesistenti; la modifica non ne aggiunge.

Fonti della fotografia di calendario:
- https://api.jolpi.ca/ergast/f1/2026/races/?limit=100
- https://www.formula1.com/en/racing/2026

La pubblicazione deve includere prima il backend e poi il frontend. Non eseguire
endpoint di assegnazione punti o migrazioni del foglio come verifica del deploy.

## Stato pubblicazione

La build frontend e i nove test backend sono riusciti. Dopo il login Cloudflare
di Michele, backend e frontend sono stati pubblicati il 3 ottobre 2026:

- Backend: `4868c3a9-3031-476d-8f33-3517772d3588`
- Frontend: `f0fca946-6d79-4618-af3e-c93a5f54b561`
- Sito: https://project-f1-frontend.michelepizzica.workers.dev

Verifiche remote effettuate esclusivamente in lettura:

- Il calendario restituisce tutti i 31 blocchi, con Bahrain ID 23,
  Singapore Sprint ID 24 e Singapore gara ID 25.
- I sei pronostici Bahrain coincidono con il backup precedente alle modifiche.
- I blocchi Singapore sono rimasti vuoti e identici al backup.
- L'intero intervallo `A1:N134` coincide con la copia iniziale.
- Il sito serve il nuovo asset e la versione calendario `2026-10-03-sheet-31`.

Non sono stati richiamati endpoint di scrittura dei pronostici, assegnazione punti
o migrazione del foglio durante la pubblicazione e le verifiche.
