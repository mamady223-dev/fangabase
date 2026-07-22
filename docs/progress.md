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
| 11 - Durcissement                   | Partiel            | Lint, format, typecheck, 79 tests JS/TS et 93 tests PHP; CORS exact, cookies et CSRF couverts; audits                                                                       | E2E navigateur, vraie base PostgreSQL/MySQL, performance, SAST/image scan executes        |
| 12 - Release candidate              | FAIL               | Build Next et 3 packages TS; migrations SQLite vertes; aucun avis haut/critique                                                                                             | Tous les restes ci-dessus et clone propre                                                 |

## Limites UAT

Docker est absent : PostgreSQL/MySQL conteneurises, scan d'image et recettes Docker sont UAT en attente. Aucun compte fournisseur n'est configure : sandbox/live non executes. Les mocks ne prouvent pas la production.

## Checkpoint Git

Les checkpoints jusqu'au jalon 7, dont `a21c3d8`, sont publies sur `origin/main`. Le jalon 8 `079174e` reste local tant que GitHub:443 est inaccessible. L'identite Git reste configuree uniquement dans ce depot.

## Prochain lot exact

Jalon 11 : durcissement restant avec E2E navigateur headless, PostgreSQL/MySQL reels, performance et SAST. Le jalon 10 Skills est deja termine; les UAT externes ne sont pas presentees comme reussies.

## Definition du jalon 9

Le jalon 9 ne construit aucun design FangaBase. Il fournit uniquement le workflow d'integration du design choisi par l'etudiant. Banani et les exemples frontend restent facultatifs. Responsive, accessibilite et tests s'appliquent seulement au design effectivement choisi ou fourni.

## Modification ACL

`CodexSandboxUsers` a recu `Modify` sur le dossier FangaBase et ses descendants, sans FullControl ni changement de proprietaire/parents. Retrait apres travaux : `icacls "C:\Users\mamad\Documents\PROJET\FangaBase" /remove:g "DESKTOP-4322UBF\CodexSandboxUsers" /T /C`.
