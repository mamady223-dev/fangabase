# Raccorder un frontend choisi

FangaBase fournit un backend headless. L'Ã©tudiant choisit seul son design. Stitch, Banani, une maquette, une gÃ©nÃ©ration IA ou un frontend personnalisÃ© sont des sources facultatives de travail, jamais des dÃ©pendances runtime.

## Parcours dÃ©butant

1. Lire `fangabase.config.yaml` et identifier le profil de dÃ©ploiement, l'URL Laravel et l'origine frontend.
2. Choisir explicitement `headless`, `stitch`, `banani`, `provided_mockups`, `ai_generated` ou `custom_frontend`. L'IA n'est choisie que sur demande explicite.
3. N'intÃ©grer que les Ã©crans demandÃ©s. Les pages sous `examples/frontend-pages` restent des dÃ©monstrations non officielles.
4. Utiliser le client neutre exportÃ© par `@fangabase/contracts` ou respecter les routes ci-dessous.
5. Tester connexion, cookies, CSRF, erreurs, permissions et Ã©tats avant validation visuelle mobile/desktop.

Les fichiers d'assistance externes attendus sont `Fanga_design_stitch.md` et `Fanga_design_Banani.md` Ã  la racine du dÃ©pÃ´t. Ils sont lus par Codex aprÃ¨s crÃ©ation des Ã©crans ; ils ne sont ni embarquÃ©s ni exÃ©cutÃ©s en production. Ils sont présents et audités au 22 juillet 2026 ; leur lecture seule ne les active pas. Stitch a Ã©tÃ© testÃ© par l'utilisateur mais reste externe. Banani MCP/abonnement reste une UAT non validÃ©e et aucune URL MCP ne doit Ãªtre supposÃ©e.

## Configuration publique neutre

```dotenv
NEXT_PUBLIC_FRONTEND_ORIGIN=https://app.example.invalid
NEXT_PUBLIC_BACKEND_URL=https://api.example.invalid/api/
```

Seules les origines et options publiques entrent dans `NEXT_PUBLIC_*` ou `VITE_*`. `APP_KEY`, URL de base privÃ©e, clÃ©s OAuth, e-mail, paiement, stockage et tokens restent exclusivement serveur. En local seulement, `http://localhost:3000` et `http://localhost:8000` sont admis.

## Authentification et sÃ©curitÃ©

Laravel crÃ©e `fangabase_refresh` HttpOnly et `fangabase_csrf` lisible par le client. Toutes les mutations protÃ©gÃ©es renvoient le contenu exact du cookie CSRF dans `X-CSRF-TOKEN`, avec `credentials: include`. Le refresh tourne via `POST /auth/refresh`; `POST /auth/logout` ferme la session courante et `POST /auth/logout-all` les ferme toutes. Ne stocker aucun refresh token dans `localStorage`.

Inscription et connexion utilisent `POST /auth/register` et `/auth/login`. VÃ©rification : `POST /auth/email/verification/request` puis `/confirm`. Mot de passe oubliÃ© : `POST /auth/password/forgot` puis `/reset`. Google, lorsqu'il est configurÃ©, dÃ©marre par `GET /oauth/google/start` et revient sur `/oauth/google/callback`; seules les redirections serveur autorisÃ©es sont utilisÃ©es.

## Contrat HTTP rÃ©ellement exposÃ©

La base Laravel est `/api`. Routes publiques : `/health`, `/readiness`, `/catalog`, les routes d'identitÃ© ci-dessus et les deux routes OAuth. Les webhooks `/webhooks/stripe` et `/webhooks/payouts/{provider}` sont rÃ©servÃ©s aux fournisseurs et ne sont jamais appelÃ©s par le frontend.

Une session est requise pour `/organizations`, `/organizations/{organization}`, leurs membres, `/billing/summary`, `/billing/credits`, `/billing/subscription`, `/billing/entitlements`, `/withdrawals` et `/withdrawals/balance`. Les mutations organisation, checkout, remboursement, compte de retrait, retrait, achat de crÃ©dits et abonnement exigent Ã©galement CSRF. Les routes `/admin/*` exigent en plus le rÃ´le global adÃ©quat. Le dÃ©tail exact reste dans `apps/server/routes/api.php` et le contrat machine dans `packages/contracts/openapi/openapi.yaml` ; ne jamais inventer une route.

Les listes administratives utilisent `page` et `per_page` bornÃ© Ã  100. Validation invalide retourne 422. Le rate limiting retourne 429 sans rÃ©vÃ©ler l'existence d'un compte. Les fichiers restent privÃ©s via le port de stockage ; aucune route publique d'upload n'est actuellement exposÃ©e. Health confirme le processus, readiness la base, sans secret.

Les erreurs ont toujours `{ "error": { "code", "message", "requestId" } }`. Le client doit brancher son comportement sur `code`, afficher `message` et conserver `requestId` pour le support, jamais une exception brute.

## Sources externes

- Stitch : inspecter le projet et les rÃ©fÃ©rences rÃ©elles, prÃ©server le backend, demander validation avant changements importants, intÃ©grer Ã©cran par Ã©cran, protÃ©ger la clÃ© et tester les API. Stitch ne fait pas partie du runtime.
- Banani : utiliser uniquement ses instructions rÃ©ellement fournies. Proposer MCP seulement s'il est disponible ; sinon accepter HTML/CSS ou images. Aucun abonnement, URL, clÃ© ou commande ne peut Ãªtre inventÃ©.
- Maquette ou frontend personnalisÃ© : mapper les Ã©crans aux contrats existants sans modifier auth, finance, rÃ´les ou sÃ©curitÃ©. Toute intÃ©gration exige tests fonctionnels et validation visuelle.
