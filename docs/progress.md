# Progression FangaBase

Derniere mise a jour : 2026-07-22

| Jalon                               | Etat               | Preuves                                                                                                                                                                     | Reste obligatoire                                                                         |
| ----------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 0 - Audit initial                   | Termine            | Depot et outils audites, ADR 0001                                                                                                                                           | Docker absent, UAT uniquement                                                             |
| 1 - Fondation                       | Termine            | Monorepo, CLI interactif/fichier/dry-run/idempotent, contrats, Next/Laravel, health, CI                                                                                     | SDK genere a automatiser                                                                  |
| 2 - Identite et securite            | Termine            | Auth persistante, verification/reset one-shot, Outbox locale chiffree, familles de sessions, replay/CSRF, Google PKCE et suspension testes                                  | UAT Google reelle avec compte externe                                                     |
| 3 - Organisations et administration | Termine            | Organisations, adhesions, invitations one-shot, policies, anti-IDOR, administration globale, audit et dernier SUPERADMIN testes                                             | Interface back-office suivie au jalon 9                                                   |
| 4 - Infrastructure                  | Termine localement | Contrat mail commun, Resend/Brevo/SMTP/local injectables, worker SQL avec bail/retry/DEAD/historique, stockage prive local et port distant                                  | UAT fournisseurs, multi-worker PostgreSQL/MySQL et clients officiels de stockage          |
| 5 - Finance commune                 | Termine localement | Catalogue versionne, credits append-only et lots FEFO, abonnements neutres, entitlements, API et interfaces utilisateur/admin                                               | Courses PostgreSQL/MySQL et fournisseurs reels au jalon 6                                 |
| 6 - Fournisseurs                    | Termine localement | Registre de capacites, checkout serveur, Stripe checkout/statut/refund/webhook, FedaPay transaction/token/statut, reconciliation, refunds, Monero isole, 11 tests cibles    | UAT sandbox Stripe/FedaPay; contrats officiels des autres fournisseurs; wallet RPC Monero |
| 7 - Retraits et rapprochement       | Termine localement | Persistence transactionnelle, ledger reserve/disponible/paye, approbation, suspension, worker a bail, retry, polling, callback, API headless, audit et rapprochement testes | UAT payout/callback officiels et concurrence PostgreSQL/MySQL                             |
| 8 - Profils de deploiement          | Termine localement | Quatre familles CLI, artefacts selectifs et proteges, 9 configs, smoke read-only, manifeste SHA-256 et restauration temporaire; 33 tests CLI                                | Docker build/scan, PostgreSQL/MySQL et restauration live en UAT                           |
| 9 - Workflow design                 | Termine localement | Connexion frontend neutre, client type, contrats/routes verifies, matrice CORS/CSRF/cookies, sources Stitch/Banani/maquettes/IA/custom explicites et skill facultative      | Validation visuelle uniquement lorsqu'un design reel est fourni; Banani MCP reste UAT     |
| 10 - Skills                         | Termine            | 7 skills, references, metadata, 7 validations quick_validate, cas activation                                                                                                | Forward-test facultatif non execute                                                       |
| 11 - Durcissement                   | Termine localement | 79 tests JS/TS, 94 PHP/620 assertions, 2 E2E Chrome, budget health/readiness 0,501 s; CI PostgreSQL/MySQL, CodeQL et Gitleaks configurée                                    | PostgreSQL/MySQL, CodeQL/Gitleaks distants et charge multi-worker à observer en CI/UAT    |
| 12 - Release candidate              | FAIL               | Build Next et 3 packages TS; migrations SQLite vertes; aucun avis haut/critique                                                                                             | Tous les restes ci-dessus et clone propre                                                 |

## Limites UAT

Docker, PostgreSQL et MySQL sont absents localement : leurs migrations, verrous et concurrences restent à valider dans `ci-databases`. CodeQL et Gitleaks sont configurés mais non exécutés localement. Les fournisseurs réels restent UAT.

## Checkpoint Git

Les jalons 8 `079174e` et 9 `982c844` sont publies sur `origin/main`. Le jalon 11 est prepare localement. L'identite Git reste configuree uniquement dans ce depot.

## Prochain lot exact

Jalon 12 : release candidate, observation des nouveaux workflows GitHub, clone propre, UAT PostgreSQL/MySQL/Docker et décision de licence.

## Definition du jalon 9

Le jalon 9 ne construit aucun design FangaBase. Il fournit uniquement le workflow d'integration du design choisi par l'etudiant. Banani et les exemples frontend restent facultatifs. Responsive, accessibilite et tests s'appliquent seulement au design effectivement choisi ou fourni.

## Modification ACL

`CodexSandboxUsers` a recu `Modify` sur le dossier FangaBase et ses descendants, sans FullControl ni changement de proprietaire/parents. Retrait apres travaux : `icacls "C:\Users\mamad\Documents\PROJET\FangaBase" /remove:g "DESKTOP-4322UBF\CodexSandboxUsers" /T /C`.
