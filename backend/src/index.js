import { RACES, CALENDAR_VERSION, getRaceTiming, resolveSeasonRace } from "../../shared/calendar.mjs";
import fallbackStandings from "../standings.json" with { type: "json" };

const PLAYERS = ["Andrea", "Giovanni", "Luca", "Marco", "Michele", "Salvo"];
const SCORE_COLUMNS = ["I", "J", "K", "L", "M", "N"];
const SHEET_NAME = "Foglio1";
const JOLPI_BASE_URL = "https://api.jolpi.ca/ergast/f1/2026";
const JOLPI_CACHE = new Map();
const JOLPI_CACHE_TTL_MS = 5 * 60 * 1000;

const PLAYER_COLUMNS = {
    Andrea: "C",
    Giovanni: "D",
    Luca: "E",
    Marco: "F",
    Michele: "G",
    Salvo: "H",
};
const PLAYER_SCORE_COLUMNS = {
    Andrea: "I",
    Giovanni: "J",
    Luca: "K",
    Marco: "L",
    Michele: "M",
    Salvo: "N",
};
const DRIVER_ALIASES = {
    RUS: "Russell",
    RUSSELL: "Russell",
    RUSSEL: "Russell",
    LEC: "Leclerc",
    LECLERC: "Leclerc",
    LECRERC: "Leclerc",
    PIA: "Piastri",
    PIASTRI: "Piastri",
    VER: "Verstappen",
    VERSTAPPEN: "Verstappen",
    HAM: "Hamilton",
    HAMILTON: "Hamilton",
    ANT: "Antonelli",
    ANTONELLI: "Antonelli",
    NOR: "Norris",
    NORRIS: "Norris",
};
function getRaceRows(raceId) {
    const base = 3 + (raceId - 1) * 4;
    return {
        pole: base,
        first: base + 1,
        second: base + 2,
        third: base + 3,
    };
}

function getRaceById(raceId) {
    return RACES.find((race) => race.id === raceId) || null;
}

function assertRaceSheetLabel(race, label) {
    const normalize = (value) => String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
    if (!race || normalize(label) !== normalize(race.sheetName)) {
        throw new Error("La struttura del foglio non corrisponde alla gara: operazione bloccata");
    }
}

function assertCalendarVersion(body) {
    if (body.calendarVersion !== CALENDAR_VERSION) {
        throw new Error("Il calendario è stato aggiornato: ricarica la pagina prima di continuare");
    }
}

function isRaceCancelled(race) {
    return Boolean(race?.isCancelled);
}

function normalizeDriverName(value) {
    const raw = (value || "").toString().trim().replace(/\s+/g, " ").toUpperCase();
    if (!raw) {
        return "";
    }

    return DRIVER_ALIASES[raw] || `${raw[0]}${raw.slice(1).toLowerCase()}`;
}

function getExpectedSessionName(race) {
    return race.isSprint ? "Sprint Qualifying" : "Qualifying";
}

function getRaceSessionName(race) {
    return race.isSprint ? "Sprint" : "Race";
}

async function fetchJson(url, { allowNoResults = false } = {}) {
    const response = await fetch(url);
    if (!response.ok) {
        const text = await response.text();
        if (
            allowNoResults &&
            response.status === 400 &&
            text.toLowerCase().includes("no results found")
        ) {
            return [];
        }
        throw new Error(`Errore fetch ${response.status}: ${text}`);
    }
    return response.json();
}

async function fetchJolpiMrData(path) {
    const data = await fetchJson(`${JOLPI_BASE_URL}${path}`);
    return data?.MRData || {};
}

function toSessionDate(session) {
    if (!session?.date || !session?.time) {
        return null;
    }

    const time = session.time;
    const parsed = new Date(`${session.date}T${time}`);
    return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function getSessionPayload(sessionName, session) {
    const dateStart = toSessionDate(session);
    if (!dateStart) {
        return null;
    }

    return {
        sessionName,
        dateStart: dateStart.toISOString(),
        dateEnd: null,
        countryName: null,
        location: null,
    };
}

async function getCachedJolpiData(path) {
    const current = JOLPI_CACHE.get(path);
    if (current && current.expiresAt > Date.now()) return current.promise;
    const entry = { expiresAt: Date.now() + JOLPI_CACHE_TTL_MS };
    entry.promise = fetchJolpiMrData(path).catch((error) => {
        if (JOLPI_CACHE.get(path) === entry) JOLPI_CACHE.delete(path);
        throw error;
    });
    JOLPI_CACHE.set(path, entry);
    return entry.promise;
}

async function getJolpiRoundRace(race) {
    const data = await getCachedJolpiData("/races/?limit=100");
    return resolveSeasonRace(race, data?.RaceTable?.Races || []);
}

async function getJolpiResultRace(roundRace, kind) {
    const round = Number(roundRace.round);
    if (!Number.isInteger(round) || round < 1) throw new Error("Round Jolpi non valido");
    const data = await getCachedJolpiData('/' + round + '/' + kind + '/');
    const result = data?.RaceTable?.Races?.[0];
    if (!result || result.season !== roundRace.season || result.Circuit?.circuitId !== roundRace.Circuit.circuitId || result.date !== roundRace.date) {
        throw new Error("Risultati Jolpi mancanti o riferiti a un'altra gara");
    }
    return result;
}

function parseLapTimeToMs(value) {
    if (!value || typeof value !== "string") {
        return Number.POSITIVE_INFINITY;
    }

    const match = value.match(/^(?:(\d+):)?(\d+)\.(\d{3})$/);
    if (!match) {
        return Number.POSITIVE_INFINITY;
    }

    const [, minutesRaw, secondsRaw, millisRaw] = match;
    const minutes = Number(minutesRaw || 0);
    const seconds = Number(secondsRaw || 0);
    const millis = Number(millisRaw || 0);
    return minutes * 60_000 + seconds * 1_000 + millis;
}

function getPoleFromQualifyingResults(results = []) {
    const ordered = [...results].sort((a, b) => {
        const aBest = Math.min(
            parseLapTimeToMs(a.Q3),
            parseLapTimeToMs(a.Q2),
            parseLapTimeToMs(a.Q1),
        );
        const bBest = Math.min(
            parseLapTimeToMs(b.Q3),
            parseLapTimeToMs(b.Q2),
            parseLapTimeToMs(b.Q1),
        );
        return aBest - bBest;
    });

    return normalizeDriverName(ordered[0]?.Driver?.familyName || "");
}

function getPodiumFromResults(results = []) {
    return [...results]
        .sort((a, b) => Number(a.position || 999) - Number(b.position || 999))
        .slice(0, 3)
        .map((entry) => normalizeDriverName(entry?.Driver?.familyName || ""));
}

function getSprintPoleFromResults(results = []) {
    const poleEntry =
        results.find((entry) => Number(entry.grid) === 1) ||
        [...results].sort((a, b) => Number(a.grid || 999) - Number(b.grid || 999))[0];

    return normalizeDriverName(poleEntry?.Driver?.familyName || "");
}

async function getPredictionLockInfo(raceId) {
    const race = getRaceById(raceId);
    if (!race) {
        throw new Error("Gara non supportata");
    }
    if (isRaceCancelled(race)) {
        return {
            raceId,
            raceName: race.name,
            sessionName: null,
            lockAt: null,
            source: "cancelled_race",
            isLocked: true,
            isCancelled: true,
        };
    }

    const schedule = await getRaceScheduleInfo(raceId);
    if (!schedule.qualifying || !schedule.raceSession) {
        throw new Error("Orari ufficiali incompleti: impossibile verificare la chiusura pronostici");
    }
    const { lockStartsAt } = getRaceTiming(race, schedule);
    if (!lockStartsAt) throw new Error("Orario di chiusura pronostici non disponibile");
    return {
        raceId,
        raceName: race.name,
        sessionName: getExpectedSessionName(race),
        lockAt: lockStartsAt.toISOString(),
        source: "jolpi",
        isLocked: new Date() >= lockStartsAt,
    };
}

async function getRaceScheduleInfo(raceId) {
    const race = getRaceById(raceId);
    if (!race) throw new Error("Gara non supportata");
    if (isRaceCancelled(race)) {
        return { raceId, raceName: race.name, isCancelled: true, qualifying: null, raceSession: null };
    }
    const roundRace = await getJolpiRoundRace(race);
    return {
        raceId,
        raceName: race.name,
        qualifying: getSessionPayload(getExpectedSessionName(race), race.isSprint ? roundRace.SprintQualifying : roundRace.Qualifying),
        raceSession: getSessionPayload(getRaceSessionName(race), race.isSprint ? roundRace.Sprint : roundRace),
    };
}

async function assertPredictionWindowOpen(raceId) {
    const lockInfo = await getPredictionLockInfo(raceId);
    if (lockInfo.isLocked) {
        throw new Error("Pronostici chiusi per questa gara");
    }
}

async function getAccessToken(googleServiceAccountJson) {
    if (!googleServiceAccountJson) {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON non configurato");
    }

    const creds = JSON.parse(googleServiceAccountJson);
    const now = Math.floor(Date.now() / 1000);

    const header = {
        alg: "RS256",
        typ: "JWT",
    };

    const claimSet = {
        iss: creds.client_email,
        scope: "https://www.googleapis.com/auth/spreadsheets",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
    };

    const encoder = new TextEncoder();

    function base64UrlEncode(obj) {
        const json = typeof obj === "string" ? obj : JSON.stringify(obj);
        const base64 = btoa(unescape(encodeURIComponent(json)));
        return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }

    const unsignedToken = `${base64UrlEncode(header)}.${base64UrlEncode(claimSet)}`;

    const keyData = `-----BEGIN PRIVATE KEY-----\n${creds.private_key
        .replace("-----BEGIN PRIVATE KEY-----", "")
        .replace("-----END PRIVATE KEY-----", "")
        .replace(/\s+/g, "")}\n-----END PRIVATE KEY-----\n`;

    const key = await crypto.subtle.importKey(
        "pkcs8",
        strToArrayBuffer(keyData),
        {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
        },
        false,
        ["sign"],
    );

    const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        key,
        encoder.encode(unsignedToken),
    );

    const jwt = `${unsignedToken}.${arrayBufferToBase64Url(signature)}`;

    const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt,
        }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Errore token Google: ${res.status} ${text}`);
    }

    const data = await res.json();
    return data.access_token;
}

function strToArrayBuffer(str) {
    const binaryString = atob(str.replace(/-----[^-]+-----/g, "").replace(/\s+/g, ""));
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function arrayBufferToBase64Url(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function readRange({ sheetId, accessToken, range }) {
    const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Errore lettura Sheets: ${res.status} ${text}`);
    }

    return res.json();
}

function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                cell += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === "," && !inQuotes) {
            row.push(cell);
            cell = "";
            continue;
        }

        if ((char === "\n" || char === "\r") && !inQuotes) {
            if (char === "\r" && next === "\n") {
                i++;
            }
            row.push(cell);
            rows.push(row);
            row = [];
            cell = "";
            continue;
        }

        cell += char;
    }

    if (cell.length > 0 || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }

    return rows;
}

async function readPublicRange({ sheetId, range, sheetName = SHEET_NAME }) {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
        sheetName,
    )}&range=${encodeURIComponent(range)}`;
    const res = await fetch(url);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Errore lettura pubblica Sheets: ${res.status} ${text}`);
    }

    const text = await res.text();
    return { values: parseCsv(text) };
}

async function readSheetRange({ sheetId, accessToken, range }) {
    if (accessToken) {
        try {
            return await readRange({ sheetId, accessToken, range });
        } catch (error) {
            console.warn(`Lettura autenticata fallita per ${range}, provo accesso pubblico`, error.message);
        }
    }

    return readPublicRange({ sheetId, range });
}

async function writeValue({ sheetId, accessToken, range, value }) {
    return writeValues({
        sheetId,
        accessToken,
        range,
        values: [[value]],
        valueInputOption: "RAW",
    });
}

async function writeValues({
    sheetId,
    accessToken,
    range,
    values,
    valueInputOption = "RAW",
}) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
        range,
    )}?valueInputOption=${valueInputOption}`;

    const body = {
        range,
        majorDimension: "ROWS",
        values,
    };

    const res = await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Errore scrittura Sheets: ${res.status} ${text}`);
    }
}

async function getOfficialRaceResult(race) {
    const roundRace = await getJolpiRoundRace(race);

    if (race.isSprint) {
        const sprintRace = await getJolpiResultRace(roundRace, "sprint");
        const sprintResults = sprintRace.SprintResults || [];

        return {
            pole: getSprintPoleFromResults(sprintResults),
            podium: getPodiumFromResults(sprintResults),
        };
    }

    const [qualifyingRace, resultsRace] = await Promise.all([
        getJolpiResultRace(roundRace, "qualifying"),
        getJolpiResultRace(roundRace, "results"),
    ]);

    return {
        pole: getPoleFromQualifyingResults(qualifyingRace.QualifyingResults || []),
        podium: getPodiumFromResults(resultsRace.Results || []),
    };
}
 
function parseRaceSheetValues(race, values = []) {
    const rows = [0, 1, 2, 3].map((index) => values[index] || []);
    const predictions = PLAYERS.reduce((acc, player) => {
        const predictionColumnIndex = PLAYER_COLUMNS[player].charCodeAt(0) - "A".charCodeAt(0);
        const scoreColumnIndex = PLAYER_SCORE_COLUMNS[player].charCodeAt(0) - "A".charCodeAt(0);
        acc[player] = {
            pole: normalizeDriverName(rows[0][predictionColumnIndex] || ""),
            podium: [
                normalizeDriverName(rows[1][predictionColumnIndex] || ""),
                normalizeDriverName(rows[2][predictionColumnIndex] || ""),
                normalizeDriverName(rows[3][predictionColumnIndex] || ""),
            ],
            manualScore: Number(rows[0][scoreColumnIndex] || 0),
        };
        return acc;
    }, {});

    return {
        raceId: race.id,
        raceName: race.name,
        predictions,
    };
}

function computeRaceScore(prediction, official) {
    let score = normalizeDriverName(prediction.pole) === official.pole ? 2 : 0;
    for (let index = 0; index < 3; index++) {
        const predictedDriver = normalizeDriverName(prediction.podium[index]);
        if (!predictedDriver) {
            continue;
        }
        if (predictedDriver === official.podium[index]) {
            score += 3;
        } else if (official.podium.includes(predictedDriver)) {
            score += 1;
        }
    }
    return score;
}

async function buildCompletedRacesComparison({ sheetId, accessToken, now = new Date() }) {
    const comparisons = [];
    for (const race of RACES) {
        if (isRaceCancelled(race)) {
            continue;
        }
        const rows = getRaceRows(race.id);
        const range = `${SHEET_NAME}!A${rows.pole}:N${rows.third}`;
        const raceValues = await readSheetRange({
            sheetId,
            accessToken,
            range,
        });
        const parsed = parseRaceSheetValues(race, raceValues.values || []);
        const hasAnyManualScore = PLAYERS.some(
            (player) => (raceValues.values?.[0]?.[PLAYER_SCORE_COLUMNS[player].charCodeAt(0) - "A".charCodeAt(0)] || "") !== "",
        );
        if (!hasAnyManualScore) {
            continue;
        }
        const official = await getOfficialRaceResult(race);
        const perPlayer = PLAYERS.map((player) => {
            const computed = computeRaceScore(parsed.predictions[player], official);
            const manual = parsed.predictions[player].manualScore;
            return {
                player,
                computed,
                manual,
                matches: computed === manual,
            };
        });

        comparisons.push({
            raceId: race.id,
            raceName: race.name,
            official,
            perPlayer,
        });
    }

    return comparisons;
}

async function buildRaceScoresPayload({ sheetId, accessToken, raceId }) {
    const race = getRaceById(raceId);
    if (!race) {
        throw new Error("Gara non supportata");
    }
    if (isRaceCancelled(race)) {
        throw new Error("Impossibile calcolare i punti per una gara annullata");
    }

    const rows = getRaceRows(race.id);
    const readRangeA1 = `${SHEET_NAME}!A${rows.pole}:N${rows.third}`;
    const raceValues = await readSheetRange({
        sheetId,
        accessToken,
        range: readRangeA1,
    });
    assertRaceSheetLabel(race, raceValues.values?.[0]?.[0]);
    const parsed = parseRaceSheetValues(race, raceValues.values || []);
    const official = await getOfficialRaceResult(race);
    const scoreValues = PLAYERS.map((player) =>
        computeRaceScore(parsed.predictions[player], official),
    );
    const writeRangeA1 = getScoreRange(race.id);

    return {
        race,
        official,
        readRangeA1,
        writeRangeA1,
        scoreValues,
        perPlayer: PLAYERS.map((player, index) => ({
            player,
            score: scoreValues[index],
        })),
    };
}

async function applyRaceScores({ sheetId, accessToken, raceId }) {
    if (!accessToken) {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON non configurato");
    }

    const payload = await buildRaceScoresPayload({ sheetId, accessToken, raceId });

    await writeValues({
        sheetId,
        accessToken,
        range: payload.writeRangeA1,
        values: [payload.scoreValues],
        valueInputOption: "RAW",
    });

    return payload;
}

async function getRaceAutoScoreAvailableAt(race) {
    const schedule = await getRaceScheduleInfo(race.id);
    const { raceStartsAt } = getRaceTiming(race, schedule);
    // A complete day after the actual session, never after a guessed qualifying date.
    return raceStartsAt ? new Date(raceStartsAt.getTime() + 24 * 60 * 60 * 1000) : null;
}

async function hasStoredScores({ sheetId, accessToken, raceId }) {
    const scoreRange = getScoreRange(raceId);
    const scoreRes = await readSheetRange({
        sheetId,
        accessToken,
        range: scoreRange,
    });
    const values = scoreRes.values?.[0] || [];
    return values.some((value) => `${value}`.trim() !== "");
}

async function applyPendingRaceScores({ sheetId, accessToken, now = new Date() }) {
    const applied = [];
    const skipped = [];

    for (const race of RACES) {
        if (isRaceCancelled(race)) {
            skipped.push({ raceId: race.id, raceName: race.name, reason: "cancelled" });
            continue;
        }

        let availableAt;
        try {
            availableAt = await getRaceAutoScoreAvailableAt(race);
        } catch (error) {
            skipped.push({ raceId: race.id, raceName: race.name, reason: "schedule_unavailable", error: error.message });
            continue;
        }
        if (!availableAt || now < availableAt) {
            skipped.push({ raceId: race.id, raceName: race.name, reason: "not_ready_yet" });
            continue;
        }

        const alreadyStored = await hasStoredScores({
            sheetId,
            accessToken,
            raceId: race.id,
        });
        if (alreadyStored) {
            skipped.push({ raceId: race.id, raceName: race.name, reason: "scores_already_present" });
            continue;
        }

        try {
            const result = await applyRaceScores({
                sheetId,
                accessToken,
                raceId: race.id,
            });
            applied.push({
                raceId: race.id,
                raceName: race.name,
                range: result.writeRangeA1,
                scores: result.perPlayer,
            });
        } catch (error) {
            skipped.push({
                raceId: race.id,
                raceName: race.name,
                reason: error.message.includes("mancanti") ? "official_results_not_available" : error.message,
            });
        }
    }

    return { applied, skipped };
}

function buildCompletedRacesTestAreaValues(comparisons) {
    const values = [
        [
            "TEST API VS MANUALE",
            "Data test",
            new Date().toISOString().slice(0, 10),
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
        ],
        [
            "Gara",
            "Pole API",
            "P1 API",
            "P2 API",
            "P3 API",
            "Andrea API",
            "Andrea M",
            "Giovanni API",
            "Giovanni M",
            "Luca API",
            "Luca M",
            "Marco API",
            "Marco M",
            "Michele API",
            "Michele M",
            "Salvo API",
            "Salvo M",
            "Esito",
        ],
    ];

    for (const comparison of comparisons) {
        const playerMap = Object.fromEntries(
            comparison.perPlayer.map((entry) => [entry.player, entry]),
        );
        values.push([
            comparison.raceName,
            comparison.official.pole,
            comparison.official.podium[0] || "",
            comparison.official.podium[1] || "",
            comparison.official.podium[2] || "",
            playerMap.Andrea.computed,
            playerMap.Andrea.manual,
            playerMap.Giovanni.computed,
            playerMap.Giovanni.manual,
            playerMap.Luca.computed,
            playerMap.Luca.manual,
            playerMap.Marco.computed,
            playerMap.Marco.manual,
            playerMap.Michele.computed,
            playerMap.Michele.manual,
            playerMap.Salvo.computed,
            playerMap.Salvo.manual,
            comparison.perPlayer.every((entry) => entry.matches) ? "OK" : "DIFF",
        ]);
    }

    values.push(["Regola", "Pole=2", "Esatta=3", "Sul podio=1", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
    return values;
}

function buildStandingsPayload(sourceStandings, races = [], midSeasonPredictions = []) {
    const normalizedStandings = PLAYERS.map((name) => {
        const playerStanding = sourceStandings.find((standing) => standing.name === name);
        return {
            name,
            avatar: name[0].toUpperCase(),
            pointsTotal: Number(playerStanding?.pointsTotal || 0),
        };
    }).sort((a, b) => {
        const pointsDiff = b.pointsTotal - a.pointsTotal;
        if (pointsDiff !== 0) {
            return pointsDiff;
        }

        return a.name.localeCompare(b.name, "it");
    });

    return {
        players: PLAYERS,
        standings: normalizedStandings,
        races,
        championship: {
            midSeasonPredictions,
            totals: normalizedStandings.reduce((acc, standing) => {
                acc[standing.name] = standing.pointsTotal;
                return acc;
            }, {}),
        },
    };
}

function getFallbackPayload() {
    return buildStandingsPayload(
        fallbackStandings.standings || [],
        RACES.map((race) => ({ ...race, points: fallbackStandings.races?.find((entry) => entry.id === race.id)?.points || {} })),
        fallbackStandings.championship?.midSeasonPredictions || [],
    );
}

function getScoreRange(raceId) {
    const rows = getRaceRows(raceId);
    return `${SHEET_NAME}!${SCORE_COLUMNS[0]}${rows.pole}:${SCORE_COLUMNS[SCORE_COLUMNS.length - 1]}${rows.pole}`;
}

function buildStandingsFromTotalsRow(totalsRow = []) {
    return PLAYERS.map((name, idx) => ({
        name,
        pointsTotal: Number(totalsRow[idx] || 0),
    }));
}

function buildRaceSummaries(scoreRows = []) {
    return RACES.map((race, idx) => {
        const scoreRow = scoreRows[idx] || [];
        const points = PLAYERS.reduce((acc, player, playerIdx) => {
            acc[player] = Number(scoreRow[playerIdx] || 0);
            return acc;
        }, {});

        return {
            ...race,
            points,
        };
    });
}

function getEmptyRacePredictions(raceId) {
    return {
        raceId,
        predictions: PLAYERS.map((player, idx) => ({
            player,
            avatar: player[0].toUpperCase(),
            pole: "",
            first: "",
            second: "",
            third: "",
            column: Object.values(PLAYER_COLUMNS)[idx],
        })),
    };
}

function buildRacePredictionsPayload(raceId, values = []) {
    const predictionRows = [0, 1, 2, 3].map((rowIndex) => values[rowIndex] || []);
    return {
        raceId,
        predictions: PLAYERS.map((player, idx) => ({
            player,
            avatar: player[0].toUpperCase(),
            pole: predictionRows[0][idx + 2] || "",
            first: predictionRows[1][idx + 2] || "",
            second: predictionRows[2][idx + 2] || "",
            third: predictionRows[3][idx + 2] || "",
            column: Object.values(PLAYER_COLUMNS)[idx],
        })),
    };
}

function validatePredictions(predictions) {
    const podium = [predictions.first, predictions.second, predictions.third]
        .map((value) => (value || "").toString().trim())
        .filter(Boolean);

    if (new Set(podium).size !== podium.length) {
        throw new Error("1, 2 e 3 classificato devono essere piloti diversi");
    }
}

function jsonResponse(payload, corsHeaders, status = 200) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

export default {
    async fetch(request, env) {
        const { SHEET_ID, GOOGLE_SERVICE_ACCOUNT_JSON } = env;

        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);

        if (url.pathname === "/race-schedules" && request.method === "GET") {
            try {
                const schedules = await Promise.all(RACES.map((race) => getRaceScheduleInfo(race.id)));
                return jsonResponse({ success: true, schedules }, corsHeaders);
            } catch (error) {
                return jsonResponse({ success: false, error: error.message }, corsHeaders, 503);
            }
        }

        if (url.pathname === "/submit-prediction" && request.method === "POST") {
            try {
                const body = await request.json();
                assertCalendarVersion(body);
                const { user, raceId, predictions } = body;

                if (!PLAYER_COLUMNS[user]) {
                    throw new Error("Giocatore non valido");
                }
                if (!predictions || typeof predictions !== "object") {
                    throw new Error("Pronostici mancanti o non validi");
                }
                validatePredictions(predictions);

                const raceIdNumber = Number(raceId);
                if (!Number.isInteger(raceIdNumber) || raceIdNumber < 1) {
                    throw new Error("Gara non supportata");
                }
                await assertPredictionWindowOpen(raceIdNumber);

                const rows = getRaceRows(raceIdNumber);
                const accessToken = await getAccessToken(GOOGLE_SERVICE_ACCOUNT_JSON);
                const label = await readSheetRange({ sheetId: SHEET_ID, accessToken, range: `${SHEET_NAME}!A${rows.pole}:A${rows.pole}` });
                assertRaceSheetLabel(getRaceById(raceIdNumber), label.values?.[0]?.[0]);
                const col = PLAYER_COLUMNS[user];
                const positions = ["pole", "first", "second", "third"];

                for (const pos of positions) {
                    const row = rows[pos];
                    const value = predictions[pos] || "";
                    const range = `${SHEET_NAME}!${col}${row}`;
                    await writeValue({ sheetId: SHEET_ID, accessToken, range, value });
                }

                return jsonResponse(
                    { success: true, message: "Pronostico salvato sul Google Sheet" },
                    corsHeaders,
                );
            } catch (err) {
                console.error(err);
                return jsonResponse({ success: false, error: err.message }, corsHeaders, 400);
            }
        }

        if (url.pathname === "/race-lock" && request.method === "GET") {
            const raceIdNumber = Number(url.searchParams.get("raceId"));

            if (!Number.isInteger(raceIdNumber) || raceIdNumber < 1) {
                return jsonResponse(
                    { success: false, error: "Parametro raceId non valido" },
                    corsHeaders,
                    400,
                );
            }

            try {
                const lockInfo = await getPredictionLockInfo(raceIdNumber);
                return jsonResponse({ success: true, ...lockInfo }, corsHeaders);
            } catch (err) {
                console.error(err);
                return jsonResponse(
                    { success: false, error: err.message },
                    corsHeaders,
                    400,
                );
            }
        }

        if (url.pathname === "/setup-test-area" && request.method === "POST") {
            try {
                const accessToken = await getAccessToken(GOOGLE_SERVICE_ACCOUNT_JSON);
                const comparisons = await buildCompletedRacesComparison({
                    sheetId: SHEET_ID,
                    accessToken,
                });
                const values = buildCompletedRacesTestAreaValues(comparisons);
                const range = `${SHEET_NAME}!X11:AO${10 + values.length}`;
                await writeValues({
                    sheetId: SHEET_ID,
                    accessToken,
                    range,
                    values,
                    valueInputOption: "USER_ENTERED",
                });

                return jsonResponse(
                    {
                        success: true,
                        message: "Confronto API vs manuale scritto nel Google Sheet",
                        range,
                        racesCompared: comparisons.map((comparison) => ({
                            raceId: comparison.raceId,
                            raceName: comparison.raceName,
                            hasDiff: comparison.perPlayer.some((entry) => !entry.matches),
                        })),
                    },
                    corsHeaders,
                );
            } catch (err) {
                console.error(err);
                return jsonResponse({ success: false, error: err.message }, corsHeaders, 400);
            }
        }

        if (url.pathname === "/apply-race-scores" && request.method === "POST") {
            try {
                const body = await request.json().catch(() => ({}));
                assertCalendarVersion(body);
                const raceIdNumber = Number(body?.raceId ?? url.searchParams.get("raceId"));

                if (!Number.isInteger(raceIdNumber) || raceIdNumber < 1) {
                    throw new Error("Parametro raceId non valido");
                }

                const accessToken = await getAccessToken(GOOGLE_SERVICE_ACCOUNT_JSON);
                const result = await applyRaceScores({
                    sheetId: SHEET_ID,
                    accessToken,
                    raceId: raceIdNumber,
                });

                return jsonResponse(
                    {
                        success: true,
                        message: "Punteggi gara scritti nel Google Sheet",
                        raceId: result.race.id,
                        raceName: result.race.name,
                        range: result.writeRangeA1,
                        official: result.official,
                        scores: result.perPlayer,
                    },
                    corsHeaders,
                );
            } catch (err) {
                console.error(err);
                return jsonResponse({ success: false, error: err.message }, corsHeaders, 400);
            }
        }

        if (url.pathname === "/apply-pending-race-scores" && request.method === "POST") {
            try {
                const accessToken = await getAccessToken(GOOGLE_SERVICE_ACCOUNT_JSON);
                const result = await applyPendingRaceScores({
                    sheetId: SHEET_ID,
                    accessToken,
                });

                return jsonResponse(
                    {
                        success: true,
                        message: "Controllo automatico punteggi completato",
                        applied: result.applied,
                        skipped: result.skipped,
                    },
                    corsHeaders,
                );
            } catch (err) {
                console.error(err);
                return jsonResponse({ success: false, error: err.message }, corsHeaders, 400);
            }
        }

        if (url.pathname === "/race-schedule" && request.method === "GET") {
            const raceIdNumber = Number(url.searchParams.get("raceId"));

            if (!Number.isInteger(raceIdNumber) || raceIdNumber < 1) {
                return jsonResponse(
                    { success: false, error: "Parametro raceId non valido" },
                    corsHeaders,
                    400,
                );
            }

            try {
                const scheduleInfo = await getRaceScheduleInfo(raceIdNumber);
                return jsonResponse({ success: true, ...scheduleInfo }, corsHeaders);
            } catch (err) {
                console.error(err);
                if (
                    err.message.includes("429")
                    || err.message.includes("Calendario Jolpi mancante")
                ) {
                    const race = getRaceById(raceIdNumber);
                    return jsonResponse(
                        {
                            success: true,
                            raceId: raceIdNumber,
                            raceName: race?.name || "",
                            qualifying: null,
                            raceSession: null,
                            warning: err.message.includes("429")
                                ? "Rate limit Jolpi, uso fallback vuoto temporaneo"
                                : "Calendario Jolpi non ancora disponibile, uso fallback vuoto temporaneo",
                        },
                        corsHeaders,
                    );
                }
                return jsonResponse(
                    { success: false, error: err.message },
                    corsHeaders,
                    400,
                );
            }
        }

        if (url.pathname === "/standings" && request.method === "GET") {
            try {
                const accessToken = GOOGLE_SERVICE_ACCOUNT_JSON
                    ? await getAccessToken(GOOGLE_SERVICE_ACCOUNT_JSON)
                    : null;
                const totalsRes = await readSheetRange({
                    sheetId: SHEET_ID,
                    accessToken,
                    range: `${SHEET_NAME}!Q14:V14`,
                });
                const raceScoreRanges = RACES.map((race) => getScoreRange(race.id));
                const raceScoresRes = await Promise.all(
                    raceScoreRanges.map((range) =>
                        readSheetRange({
                            sheetId: SHEET_ID,
                            accessToken,
                            range,
                        }),
                    ),
                );

                const totalsRow = (totalsRes.values && totalsRes.values[0]) || [];
                const standings = buildStandingsFromTotalsRow(totalsRow);
                const races = buildRaceSummaries(
                    raceScoresRes.map((result) => (result.values && result.values[0]) || []),
                );

                return jsonResponse(buildStandingsPayload(standings, races), corsHeaders);
            } catch (err) {
                console.error(err);
                return jsonResponse(
                    {
                        ...getFallbackPayload(),
                        warning: "Dati Google Sheets non disponibili, uso fallback locale",
                        warningDetail: err.message,
                    },
                    corsHeaders,
                );
            }
        }

        if (url.pathname === "/race-predictions" && request.method === "GET") {
            const raceIdNumber = Number(url.searchParams.get("raceId"));

            if (!Number.isInteger(raceIdNumber) || raceIdNumber < 1) {
                return jsonResponse(
                    { success: false, error: "Parametro raceId non valido" },
                    corsHeaders,
                    400,
                );
            }

            try {
                const accessToken = GOOGLE_SERVICE_ACCOUNT_JSON
                    ? await getAccessToken(GOOGLE_SERVICE_ACCOUNT_JSON)
                    : null;
                const rows = getRaceRows(raceIdNumber);
                const raceRange = `${SHEET_NAME}!A${rows.pole}:H${rows.third}`;
                const raceRes = await readSheetRange({
                    sheetId: SHEET_ID,
                    accessToken,
                    range: raceRange,
                });
                assertRaceSheetLabel(getRaceById(raceIdNumber), raceRes.values?.[0]?.[0]);

                return jsonResponse(
                    buildRacePredictionsPayload(raceIdNumber, raceRes.values || []),
                    corsHeaders,
                );
            } catch (err) {
                console.error(err);
                return jsonResponse(
                    {
                        ...getEmptyRacePredictions(raceIdNumber),
                        warning: "Lettura Google Sheets non disponibile",
                        warningDetail: err.message,
                    },
                    corsHeaders,
                );
            }
        }

        return new Response("FantaF1 API Operational", { headers: corsHeaders });
    },

    async scheduled(event, env, ctx) {
        try {
            const accessToken = await getAccessToken(env.GOOGLE_SERVICE_ACCOUNT_JSON);
            const result = await applyPendingRaceScores({
                sheetId: env.SHEET_ID,
                accessToken,
                now: new Date(event.scheduledTime || Date.now()),
            });

            console.log(
                JSON.stringify({
                    type: "scheduled_apply_pending_race_scores",
                    appliedCount: result.applied.length,
                    skippedCount: result.skipped.length,
                }),
            );
        } catch (error) {
            console.error("Errore scheduled applyPendingRaceScores", error);
            throw error;
        }
    },
};

// Named exports support read-only regression tests; the Worker uses the default export.
export { getRaceRows, getScoreRange, getRaceScheduleInfo, getPredictionLockInfo, assertPredictionWindowOpen, getOfficialRaceResult, getRaceAutoScoreAvailableAt, buildRacePredictionsPayload, buildRaceSummaries, getFallbackPayload, assertRaceSheetLabel };
