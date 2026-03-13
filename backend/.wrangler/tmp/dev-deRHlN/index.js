var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var PLAYERS = ["Andrea", "Giovanni", "Luca", "Marco", "Michele", "Salvo"];
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
async function getAccessToken(googleServiceAccountJson) {
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
    let base64 = btoa(unescape(encodeURIComponent(json)));
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
  let base64 = btoa(binary);
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
        const raceIdNumber = Number(raceId);
        if (!Number.isInteger(raceIdNumber) || raceIdNumber < 1) {
          throw new Error("Gara non supportata");
        }
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
        return new Response(
          JSON.stringify({ success: true, message: "Pronostico salvato sul Google Sheet" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }
    if (url.pathname === "/standings" && request.method === "GET") {
      try {
        const accessToken = await getAccessToken(GOOGLE_SERVICE_ACCOUNT_JSON);
        const totalsRes = await readRange({
          sheetId: SHEET_ID,
          accessToken,
          range: "Foglio1!C14:H14"
        });
        const totalsRow = totalsRes.values && totalsRes.values[0] || [];
        const standings = PLAYERS.map((name, idx) => ({
          name,
          avatar: name[0].toUpperCase(),
          pointsTotal: Number(totalsRow[idx] || 0)
        }));
        const responsePayload = {
          players: PLAYERS,
          standings,
          races: [],
          championship: {
            midSeasonPredictions: [],
            totals: standings.reduce((acc, s) => {
              acc[s.name] = s.pointsTotal;
              return acc;
            }, {})
          }
        };
        return new Response(JSON.stringify(responsePayload), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ success: false, error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
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
