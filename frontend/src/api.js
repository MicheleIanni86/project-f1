const DEFAULT_API_BASE = 'https://fanta-f1-backend.michelepizzica.workers.dev';
const API_BASES = [...new Set([import.meta.env.VITE_API_BASE_URL, DEFAULT_API_BASE]
  .filter(Boolean)
  .map((base) => base.replace(/\/+$/, '')))];

const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export async function api(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const attempts = method === 'GET' ? 3 : 1;
  let lastError;

  for (const base of API_BASES) {
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const response = await fetch(`${base}${path}`, {
          ...options,
          signal: options.signal || AbortSignal.timeout(20_000),
        });
        const text = await response.text();
        let payload;
        try {
          payload = JSON.parse(text);
        } catch {
          // An HTML response is typically a temporary Cloudflare error or a wrong configured base URL.
          lastError = new Error('Il servizio dati non ha risposto correttamente. Riprova tra pochi secondi.');
          if (method !== 'GET') throw lastError;
          if (attempt < attempts - 1) { await wait(450 * (attempt + 1)); continue; }
          break;
        }

        if (!response.ok || payload.success === false) {
          const failure = new Error(payload.error || 'Servizio temporaneamente non disponibile. Riprova.');
          if (method === 'GET' && response.status >= 500 && attempt < attempts - 1) {
            lastError = failure;
            await wait(450 * (attempt + 1));
            continue;
          }
          throw failure;
        }
        return payload;
      } catch (failure) {
        if (options.signal?.aborted) throw failure;
        lastError = failure;
        // Never retry a write after an ambiguous network response.
        if (method !== 'GET') throw failure;
        if (attempt < attempts - 1) await wait(450 * (attempt + 1));
      }
    }
  }

  throw lastError || new Error('Servizio dati non raggiungibile. Riprova.');
}
