# Profil hybride

D?ployer `apps/web` sur Vercel et `apps/server` sur VPS ou mutualis?. Recommandation : `app.example.com` et `api.example.com`, HTTPS partout, `CORS_ORIGINS=https://app.example.com`, cookies Secure/HttpOnly avec domaine parent explicitement test? et CSRF cookie + en-t?te.

Les webhooks, workers, paiements, ledgers et retraits restent sur Laravel. Le frontend utilise le contrat OpenAPI/SDK. Pour deux domaines sans parent commun, pr?f?rer un BFF Next.js avec jeton serveur court; ne jamais ?largir CORS ? `*` avec credentials.
