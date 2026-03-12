export default {
    async fetch(request, env) {
        // Gestione CORS per permettere al Frontend di chiamare il Worker
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);

        // Endpoint per ricevere i pronostici
        if (url.pathname === "/submit-prediction" && request.method === "POST") {
            try {
                const body = await request.json();
                const { user, raceId, predictions } = body;

                // Qui loggeremo l'invio (prossimo step: integrazione Sheets)
                console.log(`Ricevuto pronostico da ${user} per gara ${raceId}:`, predictions);

                // TODO: Chiamata alle API di Google Sheets usando Service Account

                return new Response(JSON.stringify({ success: true, message: "Pronostico ricevuto correttamente!" }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            } catch (err) {
                return new Response(JSON.stringify({ success: false, error: err.message }), {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }

        return new Response("FantaF1 API Operational", { headers: corsHeaders });
    },
};
