# Progression FangaBase

Dernière mise à jour : 2026-07-22

| Jalon                               | État               | Preuves                                                                                                                                                        | Reste obligatoire                                                      |
| ----------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 0 - Audit initial                   | Terminé            | Dépôt et outils audités, ADR 0001                                                                                                                              | Docker local absent, couvert en CI lorsqu'il est compatible            |
| 1 - Fondation                       | Terminé            | Monorepo, CLI, contrats, Next/Laravel, health et CI                                                                                                            | Aucun                                                                  |
| 2 - Identité et sécurité            | Terminé            | Auth persistante, vérification/reset one-shot, Outbox, sessions, replay/CSRF et Google PKCE testés                                                             | UAT Google réelle                                                      |
| 3 - Organisations et administration | Terminé            | Organisations, invitations, policies, anti-IDOR, administration globale et audit testés                                                                        | Aucun contrôle local restant                                           |
| 4 - Infrastructure                  | Terminé localement | E-mail injectable, Outbox SQL, workers à bail et stockage privé                                                                                                | UAT fournisseurs et stockage distant                                   |
| 5 - Finance commune                 | Terminé localement | Catalogue, crédits append-only/FEFO, abonnements et entitlements                                                                                               | UAT fournisseurs réels                                                 |
| 6 - Fournisseurs                    | Terminé localement | Checkout serveur, Stripe, FedaPay, rapprochement, remboursements et Monero isolé                                                                               | UAT sandbox Stripe/FedaPay et contrats externes                        |
| 7 - Retraits et rapprochement       | Terminé localement | Ledger, approbation, worker, polling/callback et rapprochement testés                                                                                          | UAT payout/callback officiels                                          |
| 8 - Profils de déploiement          | Terminé localement | Quatre familles CLI, artefacts sélectifs, smoke, manifeste et restauration isolée                                                                              | Restauration live en UAT                                               |
| 9 - Workflow design                 | Terminé localement | Workflow explicite et facultatif, sans thème FangaBase                                                                                                         | Validation uniquement avec un design réellement fourni                 |
| 10 - Skills                         | Terminé            | Sept skills validées par `quick_validate.py`                                                                                                                   | Aucun                                                                  |
| 11 - Durcissement                   | Terminé            | SQLite, PostgreSQL 17, MySQL 8.4, E2E, CodeQL et Gitleaks                                                                                                      | Fournisseurs réels en UAT                                              |
| 12 - Release candidate              | FAIL               | RC `0.1.0-rc.1`, clone propre JS/TS et E2E, 80 tests JS/TS, 95 tests PHP/625 assertions, 11 workflows verts, package reproductible avec SHA-256/manifeste/SBOM | Identifier juridiquement le titulaire et adopter la licence définitive |

## État du jalon 12

- Le parcours étudiant génère réellement les profils Cloud, VPS, mutualisé et hybride dans des dossiers imbriqués.
- Le clone propre passe `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm release:check`, les 80 tests JS/TS, les quatre builds et les deux scénarios Playwright.
- Une installation Composer locale totalement neuve n'a pas abouti à cause de téléchargements Packagist nuls/corrompus et de délais réseau. Ce résultat est un échec externe documenté, pas un PASS masqué. Les workflows GitHub propres `ci-laravel` et `ci-databases` passent sur SQLite, PostgreSQL 17 et MySQL 8.4.
- Les 11 workflows du commit `bba3196` sont verts, y compris `ci-release`, `ci-docker`, `ci-security` et `ci-sast`.
- Le package RC est déterministe, exclut secrets et artefacts locaux, puis produit manifeste, SBOM CycloneDX et somme SHA-256 vérifiés.
- Docker reste facultatif et absent de ce poste. L'image Next compatible est construite et testée par `ci-docker`; aucun Docker n'est imposé au profil mutualisé.
- Les fournisseurs réels, comptes sandbox, transactions et restauration live restent des UAT externes explicitement signalées.

## Blocage obligatoire

Le dépôt ne contient pas l'identité juridique exacte du titulaire des droits. `LICENSE-COMMERCIAL-DRAFT.md` est donc volontairement non effectif et conserve le marqueur `[TITULAIRE LEGAL A COMPLETER]`. Aucun tag de release ne peut être créé avant fourniture du nom légal exact, adoption de la licence et, idéalement, validation par un professionnel du droit.

## Checkpoint Git

Le jalon 11 est validé au commit `6b06521`. La préparation RC, la portabilité des fins de ligne et les corrections du parcours CLI sont publiées jusqu'au commit `bba3196` sur `origin/main`.

## Prochain bloc exact

Fournir l'identité juridique exacte du titulaire des droits, finaliser la licence commerciale, relancer les gates obligatoires, puis seulement créer le tag RC/stable autorisé.

## Règle durable du jalon 9

Le jalon 9 ne construit aucun design FangaBase. Il fournit uniquement le workflow d'intégration du design choisi par l'étudiant. Banani et les exemples frontend restent facultatifs. Responsive, accessibilité et tests s'appliquent seulement au design effectivement choisi ou fourni.
