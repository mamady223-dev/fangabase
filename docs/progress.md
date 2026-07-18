# Progression FangaBase

Derniere mise a jour : 2026-07-18

| Jalon                               | Etat        | Preuves                                                                                                                                    | Reste obligatoire                                                                     |
| ----------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 0 - Audit initial                   | Termine     | Depot et outils audites, ADR 0001                                                                                                          | Docker absent, UAT uniquement                                                         |
| 1 - Fondation                       | Termine     | Monorepo, CLI interactif/fichier/dry-run/idempotent, contrats, Next/Laravel, health, CI                                                    | SDK genere a automatiser                                                              |
| 2 - Identite et securite            | Termine     | Auth persistante, verification/reset one-shot, Outbox locale chiffree, familles de sessions, replay/CSRF, Google PKCE et suspension testes | UAT Google reelle avec compte externe                                                 |
| 3 - Organisations et administration | Partiel     | Policy anti-IDOR et audit append-only                                                                                                      | Routes/policies Laravel et back-office complet                                        |
| 4 - Infrastructure                  | Partiel     | Queue durable, replay DEAD, fichiers prives, mailer local, webhook et Outbox contractuels                                                  | Adaptateurs Resend/Brevo/SMTP/stockage et workers persistants branches                |
| 5 - Finance commune                 | Partiel     | Prix serveur, idempotence scopee, ledgers, migrations finance                                                                              | Abonnements/entitlements/credits branches aux API et UI                               |
| 6 - Fournisseurs                    | Non termine | Port, registre, simulateur contractuel, statut honnete                                                                                     | Adaptateurs officiels Stripe/FedaPay et autres, remboursements live, UAT sandbox      |
| 7 - Retraits et rapprochement       | Partiel     | Reservation, approbation, worker payout, liberation sur echec                                                                              | Persistence transactionnelle, polling/callback, back-office, reconciliation planifiee |
| 8 - Profils de deploiement          | Partiel     | Vercel, VPS Next/Laravel, mutualise et hybride documentes; 9 configs validees                                                              | Smoke deploiement, Docker image scan et restauration live                             |
| 9 - Design et produit               | Partiel     | Landing, dashboard, responsive, design FangaBase, Banani documente absent                                                                  | Toutes pages auth/admin/finance, tests accessibilite et E2E                           |
| 10 - Skills                         | Termine     | 7 skills, references, metadata, 7 validations quick_validate, cas activation                                                               | Forward-test facultatif non execute                                                   |
| 11 - Durcissement                   | Partiel     | Lint, format, typecheck, 26 tests JS/TS, 27 tests PHP/195 assertions, audits                                                               | E2E navigateur, vraie base PostgreSQL/MySQL, performance, SAST/image scan executes    |
| 12 - Release candidate              | FAIL        | Build Next et 3 packages TS; migrations SQLite vertes; aucun avis haut/critique                                                            | Tous les restes ci-dessus et clone propre                                             |

## Limites UAT

Docker est absent : PostgreSQL/MySQL conteneurises, scan d'image et recettes Docker sont UAT en attente. Aucun compte fournisseur n'est configure : sandbox/live non executes. Les mocks ne prouvent pas la production.

## Checkpoint Git

Le checkpoint de fondation `b67d885` est publie sur `origin/main`. L'identite Git reste configuree uniquement dans ce depot.

## Prochain lot exact

Jalon 3 : routes et policies Laravel d'organisations et d'administration, avec anti-IDOR persistant, suspension/revocation et protection du dernier SUPERADMIN. PostgreSQL/MySQL restent UAT Docker.

## Modification ACL

`CodexSandboxUsers` a recu `Modify` sur le dossier FangaBase et ses descendants, sans FullControl ni changement de proprietaire/parents. Retrait apres travaux : `icacls "C:\Users\mamad\Documents\PROJET\FangaBase" /remove:g "DESKTOP-4322UBF\CodexSandboxUsers" /T /C`.
