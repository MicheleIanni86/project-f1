const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://fanta-f1-backend.michelepizzica.workers.dev').replace(/\/+$/, '');

export async function api(path, options = {}) {
  // A write must never be retried against a second server after an ambiguous response.
  const response = await fetch(`${API_BASE}${path}`, { ...options, signal: options.signal || AbortSignal.timeout(20_000) });
  const payload = await response.json();
  if (!response.ok || payload.success === false) throw new Error(payload.error || 'Servizio temporaneamente non disponibile. Riprova.');
  return payload;
}
