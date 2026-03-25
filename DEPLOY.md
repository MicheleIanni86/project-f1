# Deploy

## Backend

Cartella: `backend`

1. Login Cloudflare:

```powershell
cd backend
npx wrangler login
```

2. Configura il secret locale per sviluppo oppure in Cloudflare per il deploy:

```powershell
Copy-Item .dev.vars.example .dev.vars
```

Per il deploy remoto imposta anche il secret vero:

```powershell
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
```

3. Deploy:

```powershell
npm install
npm run deploy
```

Il worker usa `backend/wrangler.toml` e pubblica gli endpoint:
- `/standings`
- `/race-predictions`
- `/race-lock`
- `/race-schedule`
- `/submit-prediction`
- `/setup-test-area`

## Frontend

Cartella: `frontend`

1. Crea il file env:

```powershell
Copy-Item .env.example .env
```

2. Imposta `VITE_API_BASE_URL` con l'URL reale del worker backend.

3. Build:

```powershell
npm install
npm run build
```

4. Deploy su Cloudflare:

```powershell
npm run deploy
```

Il deploy frontend usa `frontend/wrangler.toml` e pubblica la cartella `dist`.

## Ordine corretto

1. Deploy backend
2. Copia l'URL backend dentro `frontend/.env`
3. Build frontend
4. Deploy frontend
