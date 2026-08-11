# Intégration frontend headless

FangaBase fournit un backend headless. L’étudiant choisit son design. Banani, une maquette, une génération IA explicitement demandée ou un frontend personnalisé restent facultatifs et ne sont jamais des dépendances runtime.

## Parcours

1. Lire `fangabase.config.yaml` et `ARCHITECTURE.md`.
2. Configurer uniquement l’origine publique du backend.
3. Mapper les écrans aux contrats existants sans inventer de route.
4. Conserver les cookies de session, le CSRF, les rôles et l’anti-IDOR.
5. Tester les états chargement, erreur, accès refusé et session expirée.

Les secrets OAuth, e-mail, paiement et stockage restent exclusivement côté serveur. Laravel crée un refresh token HttpOnly et un cookie CSRF lisible par le client. Les mutations protégées renvoient le jeton CSRF exact avec `credentials: include`; aucun refresh token ne va dans `localStorage`.

Le contrat machine est dans `packages/contracts/openapi/openapi.yaml`. Les routes réellement exposées sont implémentées dans `apps/server/routes/api.php` et `packages/backend-next/src/router.ts`. Les webhooks sont réservés aux fournisseurs. Les fichiers restent privés.

Les interfaces sous `examples/frontend-pages` sont des démonstrations facultatives, jamais le design officiel de FangaBase.

Le projet généré contient uniquement le workflow choisi dans `docs/design/` : un README neutre pour `headless`, le guide Stitch, le guide Banani classé UAT externe, ou le guide d’import de maquettes/frontend fourni. Les autres workflows sont absents. Leur activation intervient seulement après setup, doctor, migrations, tests, build et smoke auth verts.
