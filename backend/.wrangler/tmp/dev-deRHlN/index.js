var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// standings.json
var standings_default = {
  players: ["Andrea", "Giovanni", "Luca", "Marco", "Michele", "Salvo"],
  standings: [
    { name: "Andrea", pointsTotal: 6 },
    { name: "Giovanni", pointsTotal: 4 },
    { name: "Luca", pointsTotal: 6 },
    { name: "Marco", pointsTotal: 6 },
    { name: "Michele", pointsTotal: 2 },
    { name: "Salvo", pointsTotal: 3 }
  ],
  races: [
    {
      id: 1,
      name: "AUSTRALIA",
      date: "07 MAR",
      time: "06:00",
      isSprint: false,
      points: {
        Andrea: 6,
        Giovanni: 4,
        Luca: 6,
        Marco: 6,
        Michele: 2,
        Salvo: 3
      }
    }
  ],
  championship: {
    midSeasonPredictions: [],
    totals: {
      Andrea: 6,
      Giovanni: 4,
      Luca: 6,
      Marco: 6,
      Michele: 2,
      Salvo: 3
    }
  }
};

// src/index.js
var PLAYERS = ["Andrea", "Giovanni", "Luca", "Marco", "Michele", "Salvo"];
var SCORE_COLUMNS = ["I", "J", "K", "L", "M", "N"];
var MONTH_MAP = {
  GEN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAG: 4,
  GIU: 5,
  LUG: 6,
  AGO: 7,
  SET: 8,
  OTT: 9,
  NOV: 10,
  DIC: 11
};
var PREDICTION_OPENING_HOURS = 48;
var RACES = [
  { id: 1, name: "AUSTRALIA", date: "07 MAR", time: "06:00", isSprint: false },
  { id: 2, name: "CINA SPRINT", date: "13 MAR", time: "08:30", isSprint: true },
  { id: 3, name: "CINA", date: "14 MAR", time: "08:00", isSprint: false },
  { id: 4, name: "GIAPPONE", date: "28 MAR", time: "07:00", isSprint: false },
  { id: 5, name: "BAHRAIN", date: "11 APR", time: "18:00", isSprint: false },
  { id: 6, name: "ARABIA SAUDITA", date: "18 APR", time: "19:00", isSprint: false },
  { id: 7, name: "MIAMI SPRINT", date: "01 MAG", time: "22:30", isSprint: true },
  { id: 8, name: "MIAMI", date: "02 MAG", time: "22:00", isSprint: false },
  { id: 9, name: "CANADA SPRINT", date: "22 MAG", time: "22:30", isSprint: true },
  { id: 10, name: "CANADA", date: "23 MAG", time: "22:00", isSprint: false },
  { id: 11, name: "MONACO", date: "06 GIU", time: "16:00", isSprint: false },
  { id: 12, name: "CATALUNYA", date: "13 GIU", time: "16:00", isSprint: false },
  { id: 13, name: "AUSTRIA", date: "27 GIU", time: "16:00", isSprint: false },
  { id: 14, name: "UK SPRINT", date: "03 LUG", time: "17:30", isSprint: true },
  { id: 15, name: "UK", date: "04 LUG", time: "17:00", isSprint: false },
  { id: 16, name: "BELGIO", date: "18 LUG", time: "16:00", isSprint: false },
  { id: 17, name: "UNGHERIA", date: "25 LUG", time: "16:00", isSprint: false },
  { id: 18, name: "OLANDA SPRINT", date: "21 AGO", time: "16:30", isSprint: true },
  { id: 19, name: "OLANDA", date: "22 AGO", time: "16:00", isSprint: false },
  { id: 20, name: "ITALIA", date: "05 SET", time: "16:00", isSprint: false },
  { id: 21, name: "SPAGNA", date: "12 SET", time: "16:00", isSprint: false },
  { id: 22, name: "AZERBAIJAN", date: "25 SET", time: "14:00", isSprint: false },
  { id: 23, name: "SINGAPORE SPRINT", date: "09 OTT", time: "14:30", isSprint: true },
  { id: 24, name: "SINGAPORE", date: "10 OTT", time: "15:00", isSprint: false },
  { id: 25, name: "USA", date: "24 OTT", time: "23:00", isSprint: false },
  { id: 26, name: "MESSICO", date: "31 OTT", time: "22:00", isSprint: false },
  { id: 27, name: "BRASILE", date: "07 NOV", time: "19:00", isSprint: false },
  { id: 28, name: "LAS VEGAS", date: "21 NOV", time: "05:00", isSprint: false },
  { id: 29, name: "QATAR", date: "28 NOV", time: "19:00", isSprint: false },
  { id: 30, name: "ABU DHABI", date: "05 DIC", time: "15:00", isSprint: false }
];
var PLAYER_COLUMNS = {
  Andrea: "C",
  Giovanni: "D",
  Luca: "E",
  Marco: "F",
  Michele: "G",
  Salvo: "H"
};
function getRaceRows(raceId) {
  const base = 3 + (raceId - 1) * 4;
  return {
    pole: base,
    first: base + 1,
    second: base + 2,
    third: base + 3
  };
}
__name(getRaceRows, "getRaceRows");
function getRaceById(raceId) {
  return RACES.find((race) => race.id === raceId) || null;
}
__name(getRaceById, "getRaceById");
function toRaceDate(race) {
  const [day, month] = race.date.split(" ");
  const monthIndex = MONTH_MAP[month];
  if (monthIndex === void 0) {
    return null;
  }
  const [hours, minutes] = race.time.split(":").map(Number);
  return new Date(2026, monthIndex, Number(day), hours, minutes);
}
__name(toRaceDate, "toRaceDate");
function assertPredictionWindowOpen(raceId) {
  const race = getRaceById(raceId);
  if (!race) {
    throw new Error("Gara non supportata");
  }
  const deadline = toRaceDate(race);
  if (!deadline) {
    throw new Error("Deadline gara non configurata");
  }
  const opensAt = new Date(deadline.getTime() - PREDICTION_OPENING_HOURS * 60 * 60 * 1e3);
  const now = /* @__PURE__ */ new Date();
  if (now < opensAt) {
    throw new Error("Pronostici non ancora aperti per questa gara");
  }
  if (now >= deadline) {
    throw new Error("Pronostici chiusi per questa gara");
  }
}
__name(assertPredictionWindowOpen, "assertPredictionWindowOpen");
async function getAccessToken(googleServiceAccountJson) {
  if (!googleServiceAccountJson) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON non configurato");
  }
  const creds = JSON.parse(googleServiceAccountJson);
  const now = Math.floor(Date.now() / 1e3);
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  const claimSet = {
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };
  const encoder = new TextEncoder();
  function base64UrlEncode(obj) {
    const json = typeof obj === "string" ? obj : JSON.stringify(obj);
    const base64 = btoa(unescape(encodeURIComponent(json)));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  __name(base64UrlEncode, "base64UrlEncode");
  const unsignedToken = `${base64UrlEncode(header)}.${base64UrlEncode(claimSet)}`;
  const keyData = `-----BEGIN PRIVATE KEY-----
${creds.private_key.replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\s+/g, "")}
-----END PRIVATE KEY-----
`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    strToArrayBuffer(keyData),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(unsignedToken)
  );
  const jwt = `${unsignedToken}.${arrayBufferToBase64Url(signature)}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Errore token Google: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}
__name(getAccessToken, "getAccessToken");
function strToArrayBuffer(str) {
  const binaryString = atob(str.replace(/-----[^-]+-----/g, "").replace(/\s+/g, ""));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
__name(strToArrayBuffer, "strToArrayBuffer");
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
__name(arrayBufferToBase64Url, "arrayBufferToBase64Url");
async function readRange({ sheetId, accessToken, range }) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Errore lettura Sheets: ${res.status} ${text}`);
  }
  return res.json();
}
__name(readRange, "readRange");
async function writeValue({ sheetId, accessToken, range, value }) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
    range
  )}?valueInputOption=RAW`;
  const body = {
    range,
    majorDimension: "ROWS",
    values: [[value]]
  };
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Errore scrittura Sheets: ${res.status} ${text}`);
  }
}
__name(writeValue, "writeValue");
function buildStandingsPayload(sourceStandings, races = [], midSeasonPredictions = []) {
  const normalizedStandings = PLAYERS.map((name) => {
    const playerStanding = sourceStandings.find((standing) => standing.name === name);
    return {
      name,
      avatar: name[0].toUpperCase(),
      pointsTotal: Number(playerStanding?.pointsTotal || 0)
    };
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
      }, {})
    }
  };
}
__name(buildStandingsPayload, "buildStandingsPayload");
function getFallbackPayload() {
  return buildStandingsPayload(
    standings_default.standings || [],
    standings_default.races?.length ? standings_default.races : RACES,
    standings_default.championship?.midSeasonPredictions || []
  );
}
__name(getFallbackPayload, "getFallbackPayload");
function getScoreRange(raceId) {
  const rows = getRaceRows(raceId);
  return `Foglio1!${SCORE_COLUMNS[0]}${rows.pole}:${SCORE_COLUMNS[SCORE_COLUMNS.length - 1]}${rows.pole}`;
}
__name(getScoreRange, "getScoreRange");
function buildStandingsFromTotalsRow(totalsRow = []) {
  return PLAYERS.map((name, idx) => ({
    name,
    pointsTotal: Number(totalsRow[idx] || 0)
  }));
}
__name(buildStandingsFromTotalsRow, "buildStandingsFromTotalsRow");
function buildRaceSummaries(scoreRows = []) {
  return RACES.map((race, idx) => {
    const scoreRow = scoreRows[idx] || [];
    const points = PLAYERS.reduce((acc, player, playerIdx) => {
      acc[player] = Number(scoreRow[playerIdx] || 0);
      return acc;
    }, {});
    return {
      ...race,
      points
    };
  });
}
__name(buildRaceSummaries, "buildRaceSummaries");
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
      column: Object.values(PLAYER_COLUMNS)[idx]
    }))
  };
}
__name(getEmptyRacePredictions, "getEmptyRacePredictions");
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
      column: Object.values(PLAYER_COLUMNS)[idx]
    }))
  };
}
__name(buildRacePredictionsPayload, "buildRacePredictionsPayload");
function jsonResponse(payload, corsHeaders, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
__name(jsonResponse, "jsonResponse");
var src_default = {
  async fetch(request, env) {
    const { SHEET_ID, GOOGLE_SERVICE_ACCOUNT_JSON } = env;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    const url = new URL(request.url);
    if (url.pathname === "/submit-prediction" && request.method === "POST") {
      try {
        const body = await request.json();
        const { user, raceId, predictions } = body;
        if (!PLAYER_COLUMNS[user]) {
          throw new Error("Giocatore non valido");
        }
        if (!predictions || typeof predictions !== "object") {
          throw new Error("Pronostici mancanti o non validi");
        }
        const raceIdNumber = Number(raceId);
        if (!Number.isInteger(raceIdNumber) || raceIdNumber < 1) {
          throw new Error("Gara non supportata");
        }
        assertPredictionWindowOpen(raceIdNumber);
        const rows = getRaceRows(raceIdNumber);
        const accessToken = await getAccessToken(GOOGLE_SERVICE_ACCOUNT_JSON);
        const col = PLAYER_COLUMNS[user];
        const positions = ["pole", "first", "second", "third"];
        for (const pos of positions) {
          const row = rows[pos];
          const value = predictions[pos] || "";
          const range = `Foglio1!${col}${row}`;
          await writeValue({ sheetId: SHEET_ID, accessToken, range, value });
        }
        return jsonResponse(
          { success: true, message: "Pronostico salvato sul Google Sheet" },
          corsHeaders
        );
      } catch (err) {
        console.error(err);
        return jsonResponse({ success: false, error: err.message }, corsHeaders, 400);
      }
    }
    if (url.pathname === "/standings" && request.method === "GET") {
      try {
        if (!GOOGLE_SERVICE_ACCOUNT_JSON) {
          return jsonResponse(getFallbackPayload(), corsHeaders);
        }
        const accessToken = await getAccessToken(GOOGLE_SERVICE_ACCOUNT_JSON);
        const totalsRes = await readRange({
          sheetId: SHEET_ID,
          accessToken,
          range: "Foglio1!Q14:V14"
        });
        const raceScoreRanges = RACES.map((race) => getScoreRange(race.id));
        const raceScoresRes = await Promise.all(
          raceScoreRanges.map(
            (range) => readRange({
              sheetId: SHEET_ID,
              accessToken,
              range
            })
          )
        );
        const totalsRow = totalsRes.values && totalsRes.values[0] || [];
        const standings = buildStandingsFromTotalsRow(totalsRow);
        const races = buildRaceSummaries(
          raceScoresRes.map((result) => result.values && result.values[0] || [])
        );
        return jsonResponse(buildStandingsPayload(standings, races), corsHeaders);
      } catch (err) {
        console.error(err);
        return jsonResponse(
          {
            ...getFallbackPayload(),
            warning: "Dati Google Sheets non disponibili, uso fallback locale",
            warningDetail: err.message
          },
          corsHeaders
        );
      }
    }
    if (url.pathname === "/race-predictions" && request.method === "GET") {
      const raceIdNumber = Number(url.searchParams.get("raceId"));
      if (!Number.isInteger(raceIdNumber) || raceIdNumber < 1) {
        return jsonResponse(
          { success: false, error: "Parametro raceId non valido" },
          corsHeaders,
          400
        );
      }
      try {
        if (!GOOGLE_SERVICE_ACCOUNT_JSON) {
          return jsonResponse(getEmptyRacePredictions(raceIdNumber), corsHeaders);
        }
        const accessToken = await getAccessToken(GOOGLE_SERVICE_ACCOUNT_JSON);
        const rows = getRaceRows(raceIdNumber);
        const raceRange = `Foglio1!A${rows.pole}:H${rows.third}`;
        const raceRes = await readRange({
          sheetId: SHEET_ID,
          accessToken,
          range: raceRange
        });
        return jsonResponse(
          buildRacePredictionsPayload(raceIdNumber, raceRes.values || []),
          corsHeaders
        );
      } catch (err) {
        console.error(err);
        return jsonResponse(
          {
            ...getEmptyRacePredictions(raceIdNumber),
            warning: "Lettura Google Sheets non disponibile",
            warningDetail: err.message
          },
          corsHeaders
        );
      }
    }
    return new Response("FantaF1 API Operational", { headers: corsHeaders });
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-G9N0PD/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-G9N0PD/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
