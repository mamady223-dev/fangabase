# Raccorder un frontend choisi

FangaBase fournit un backend headless. L'étudiant choisit seul son design. Stitch, Banani, une maquette, une génération IA ou un frontend personnalisé sont des sources facultatives de travail, jamais des dépendances runtime.

## Parcours débutant

1. Lire `fangabase.config.yaml` et identifier le profil de déploiement, l'URL Laravel et l'origine frontend.
2. Choisir explicitement `headless`, `stitch`, `banani`, `provided_mockups`, `ai_generated` ou `custom_frontend`. L'IA n'est choisie que sur demande explicite.
3. N'intégrer que les écrans demandés. Les pages sous `examples/frontend-pages` restent des démonstrations non officielles.
4. Utiliser le client neutre exporté par `@fangabase/contracts` ou respecter les routes ci-dessous.
5. Tester connexion, cookies, CSRF, erreurs, permissions et états avant validation visuelle mobile/desktop.

Les fichiers d'assistance externes attendus sont `Fanga_design_stitch.md` et `Fanga_design_Banani.md` à la racine du dépôt. Ils sont lus par Codex après création des écrans ; ils ne sont ni embarqués ni exécutés en production. Ils sont absents au 22 juillet 2026 : ne pas en inventer le contenu. Stitch a été testé par l'utilisateur mais reste externe. Banani MCP/abonnement reste une UAT non validée et aucune URL MCP ne doit être supposée.

## Configuration publique neutre

```dotenv
NEXT_PUBLIC_FRONTEND_ORIGIN=https://app.example.invalid
NEXT_PUBLIC_BACKEND_URL=https://api.example.invalid/api/
```

Seules les origines et options publiques entrent dans `NEXT_PUBLIC_*` ou `VITE_*`. `APP_KEY`, URL de base privée, clés OAuth, e-mail, paiement, stockage et tokens restent exclusivement serveur. En local seulement, `http://localhost:3000` et `http://localhost:8000` sont admis.

## Authentification et sécurité

Laravel crée `fangabase_refresh` HttpOnly et `fangabase_csrf` lisible par le client. Toutes les mutations protégées renvoient le contenu exact du cookie CSRF dans `X-CSRF-TOKEN`, avec `credentials: include`. Le refresh tourne via `POST /auth/refresh`; `POST /auth/logout` ferme la session courante et `POST /auth/logout-all` les ferme toutes. Ne stocker aucun refresh token dans `localStorage`.

Inscription et connexion utilisent `POST /auth/register` et `/auth/login`. Vérification : `POST /auth/email/verification/request` puis `/confirm`. Mot de passe oublié : `POST /auth/password/forgot` puis `/reset`. Google, lorsqu'il est configuré, démarre par `GET /oauth/google/start` et revient sur `/oauth/google/callback`; seules les redirections serveur autorisées sont utilisées.

## Contrat HTTP réellement exposé

La base Laravel est `/api`. Routes publiques : `/health`, `/readiness`, `/catalog`, les routes d'identité ci-dessus et les deux routes OAuth. Les webhooks `/webhooks/stripe` et `/webhooks/payouts/{provider}` sont réservés aux fournisseurs et ne sont jamais appelés par le frontend.

Une session est requise pour `/organizations`, `/organizations/{organization}`, leurs membres, `/billing/summary`, `/billing/credits`, `/billing/subscription`, `/billing/entitlements`, `/withdrawals` et `/withdrawals/balance`. Les mutations organisation, checkout, remboursement, compte de retrait, retrait, achat de crédits et abonnement exigent également CSRF. Les routes `/admin/*` exigent en plus le rôle global adéquat. Le détail exact reste dans `apps/server/routes/api.php` et le contrat machine dans `packages/contracts/openapi/openapi.yaml` ; ne jamais inventer une route.

Les listes administratives utilisent `page` et `per_page` borné à 100. Validation invalide retourne 422. Le rate limiting retourne 429 sans révéler l'existence d'un compte. Les fichiers restent privés via le port de stockage ; aucune route publique d'upload n'est actuellement exposée. Health confirme le processus, readiness la base, sans secret.

Les erreurs ont toujours `{ "error": { "code", "message", "requestId" } }`. Le client doit brancher son comportement sur `code`, afficher `message` et conserver `requestId` pour le support, jamais une exception brute.

## Sources externes

- Stitch : inspecter le projet et les références réelles, préserver le backend, demander validation avant changements importants, intégrer écran par écran, protéger la clé et tester les API. Stitch ne fait pas partie du runtime.
- Banani : utiliser uniquement ses instructions réellement fournies. Proposer MCP seulement s'il est disponible ; sinon accepter HTML/CSS ou images. Aucun abonnement, URL, clé ou commande ne peut être inventé.
- Maquette ou frontend personnalisé : mapper les écrans aux contrats existants sans modifier auth, finance, rôles ou sécurité. Toute intégration exige tests fonctionnels et validation visuelle.
