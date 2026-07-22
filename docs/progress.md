# Progression FangaBase

Derniere mise a jour : 2026-07-22

| Jalon                               | Etat               | Preuves                                                                                                                                                                  | Reste obligatoire                                                                                |
| ----------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| 0 - Audit initial                   | Termine            | Depot et outils audites, ADR 0001                                                                                                                                        | Docker absent, UAT uniquement                                                                    |
| 1 - Fondation                       | Termine            | Monorepo, CLI interactif/fichier/dry-run/idempotent, contrats, Next/Laravel, health, CI                                                                                  | SDK genere a automatiser                                                                         |
| 2 - Identite et securite            | Termine            | Auth persistante, verification/reset one-shot, Outbox locale chiffree, familles de sessions, replay/CSRF, Google PKCE et suspension testes                               | UAT Google reelle avec compte externe                                                            |
| 3 - Organisations et administration | Termine            | Organisations, adhesions, invitations one-shot, policies, anti-IDOR, administration globale, audit et dernier SUPERADMIN testes                                          | Interface back-office suivie au jalon 9                                                          |
| 4 - Infrastructure                  | Termine localement | Contrat mail commun, Resend/Brevo/SMTP/local injectables, worker SQL avec bail/retry/DEAD/historique, stockage prive local et port distant                               | UAT fournisseurs, multi-worker PostgreSQL/MySQL et clients officiels de stockage                 |
| 5 - Finance commune                 | Termine localement | Catalogue versionne, credits append-only et lots FEFO, abonnements neutres, entitlements, API et interfaces utilisateur/admin                                            | Courses PostgreSQL/MySQL et fournisseurs reels au jalon 6                                        |
| 6 - Fournisseurs                    | Termine localement | Registre de capacites, checkout serveur, Stripe checkout/statut/refund/webhook, FedaPay transaction/token/statut, reconciliation, refunds, Monero isole, 11 tests cibles | UAT sandbox Stripe/FedaPay; contrats officiels des autres fournisseurs; wallet RPC Monero        |
| 7 - Retraits et rapprochement       | Partiel            | Reservation, approbation, worker payout, liberation sur echec                                                                                                            | Persistence transactionnelle, polling/callback, back-office, reconciliation planifiee            |
| 8 - Profils de deploiement          | Partiel            | Vercel, VPS Next/Laravel, mutualise et hybride documentes; 9 configs validees                                                                                            | Smoke deploiement, Docker image scan et restauration live                                        |
| 9 - Workflow design                 | Defini             | Headless par defaut, exemples facultatifs isoles, sources headless/Banani/maquettes/IA explicite                                                                         | Integrer uniquement le design choisi par l'etudiant; responsive, accessibilite et tests associes |
| 10 - Skills                         | Termine            | 7 skills, references, metadata, 7 validations quick_validate, cas activation                                                                                             | Forward-test facultatif non execute                                                              |
| 11 - Durcissement                   | Partiel            | Lint, format, typecheck, 34 tests JS/TS, 80 tests PHP/522 assertions, audits                                                                                             | E2E navigateur, vraie base PostgreSQL/MySQL, performance, SAST/image scan executes               |
| 12 - Release candidate              | FAIL               | Build Next et 3 packages TS; migrations SQLite vertes; aucun avis haut/critique                                                                                          | Tous les restes ci-dessus et clone propre                                                        |

## Limites UAT

Docker est absent : PostgreSQL/MySQL conteneurises, scan d'image et recettes Docker sont UAT en attente. Aucun compte fournisseur n'est configure : sandbox/live non executes. Les mocks ne prouvent pas la production.

## Checkpoint Git

Les checkpoints `b67d885`, `9e54c11`, `0187cb0`, `7860e15`, `2be77f5` et `5f45714` sont publies sur `origin/main`. L'identite Git reste configuree uniquement dans ce depot.

## Prochain lot exact

Jalon 7 : terminer la persistence transactionnelle des retraits, le polling/callback fournisseur, le back-office headless et le rapprochement planifie. Les UAT sandbox Stripe/FedaPay, wallet RPC Monero, clients de stockage distant et concurrence PostgreSQL/MySQL restent externes.

## Definition du jalon 9

Le jalon 9 ne construit aucun design FangaBase. Il fournit uniquement le workflow d'integration du design choisi par l'etudiant. Banani et les exemples frontend restent facultatifs. Responsive, accessibilite et tests s'appliquent seulement au design effectivement choisi ou fourni.

## Modification ACL

`CodexSandboxUsers` a recu `Modify` sur le dossier FangaBase et ses descendants, sans FullControl ni changement de proprietaire/parents. Retrait apres travaux : `icacls "C:\Users\mamad\Documents\PROJET\FangaBase" /remove:g "DESKTOP-4322UBF\CodexSandboxUsers" /T /C`.
