import standings from "../standings.json";

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

                console.log(`Ricevuto pronostico da ${user} per gara ${raceId}:`, predictions);

                return new Response(
                    JSON.stringify({ success: true, message: "Pronostico ricevuto correttamente!" }),
                    {
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    }
                );
            } catch (err) {
                return new Response(JSON.stringify({ success: false, error: err.message }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }

        if (url.pathname === "/standings" && request.method === "GET") {
            return new Response(JSON.stringify(standings), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response("FantaF1 API Operational", { headers: corsHeaders });
    },
};

