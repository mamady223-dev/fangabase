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
| 11 - Durcissement                   | Termine            | 79 tests JS/TS, 94 PHP/620 assertions sur SQLite, PostgreSQL 17 et MySQL 8.4, 2 E2E Chrome, budget health/readiness 0,501 s, CodeQL/Gitleaks verts                          | Charge multi-worker et fournisseurs reels restent UAT                                     |
| 12 - Release candidate              | FAIL               | Build Next et 3 packages TS; migrations SQLite vertes; aucun avis haut/critique                                                                                             | Tous les restes ci-dessus et clone propre                                                 |

## Limites UAT

Docker reste absent localement. PostgreSQL 17 et MySQL 8.4 ont execute migrate:fresh puis 94 tests en CI avec succes. CodeQL et Gitleaks sont verts. Les fournisseurs reels, la charge multi-worker et la restauration live restent UAT.

## Checkpoint Git

Les jalons 8 `079174e`, 9 `982c844` et 11 `2a7d47e` sont publies sur `origin/main`, avec correctifs CI jusqu a `1486e0c`. L identite Git reste configuree uniquement dans ce depot.

## Prochain lot exact

Jalon 12 : release candidate, clone propre, UAT Docker/charge multi-worker/fournisseurs, decision de licence et durcissement supply chain.

## Definition du jalon 9

Le jalon 9 ne construit aucun design FangaBase. Il fournit uniquement le workflow d'integration du design choisi par l'etudiant. Banani et les exemples frontend restent facultatifs. Responsive, accessibilite et tests s'appliquent seulement au design effectivement choisi ou fourni.

## Environnement Windows

L ACL explicite temporaire CodexSandboxUsers a ete retiree. Le helper sandbox conserve une erreur deny-read sur les fichiers existants ; les modifications ciblees ont donc ete appliquees avec commandes approuvees apres echec de apply_patch natif.
