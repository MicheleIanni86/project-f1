const PLAYERS = ["Andrea", "Giovanni", "Luca", "Marco", "Michele", "Salvo"];

// colonne C–H del foglio, mappate sui giocatori
const PLAYER_COLUMNS = {
    Andrea: "C",
    Giovanni: "D",
    Luca: "E",
    Marco: "F",
    Michele: "G",
    Salvo: "H",
};

// Ogni gara occupa 4 righe consecutive nel foglio:
// AUSTRALIA = 3–6, CINA SPRINT = 7–10, CINA = 11–14, ecc.
// Se numeriamo le gare in ordine dal foglio (1,2,3,...) la formula generale è:
// baseRow = 3 + (raceId - 1) * 4
function getRaceRows(raceId) {
    const base = 3 + (raceId - 1) * 4;
    return {
        pole: base,
        first: base + 1,
        second: base + 2,
        third: base + 3,
    };
}

async function getAccessToken(googleServiceAccountJson) {
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
        let base64 = btoa(unescape(encodeURIComponent(json)));
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
    let base64 = btoa(binary);
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

async function writeValue({ sheetId, accessToken, range, value }) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
        range,
    )}?valueInputOption=RAW`;

    const body = {
        range,
        majorDimension: "ROWS",
        values: [[value]],
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

                // Scrive pole / 1° / 2° / 3° nelle celle corrette del blocco gara
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
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    },
                );
            } catch (err) {
                console.error(err);
                return new Response(JSON.stringify({ success: false, error: err.message }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }

        if (url.pathname === "/standings" && request.method === "GET") {
            try {
                const accessToken = await getAccessToken(GOOGLE_SERVICE_ACCOUNT_JSON);

                // legge la riga "TOTALE:" (es. C14–H14) per i punti complessivi
                const totalsRes = await readRange({
                    sheetId: SHEET_ID,
                    accessToken,
                    range: "Foglio1!C14:H14",
                });

                const totalsRow = (totalsRes.values && totalsRes.values[0]) || [];

                const standings = PLAYERS.map((name, idx) => ({
                    name,
                    avatar: name[0].toUpperCase(),
                    pointsTotal: Number(totalsRow[idx] || 0),
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
                        }, {}),
                    },
                };

                return new Response(JSON.stringify(responsePayload), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            } catch (err) {
                console.error(err);
                return new Response(JSON.stringify({ success: false, error: err.message }), {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }

        return new Response("FantaF1 API Operational", { headers: corsHeaders });
    },
};

