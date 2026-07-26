# Progression FangaBase

## Correctif RC — Orange Money Mali

État : **PASS_WITH_WARNINGS local, CI requise** pour `0.2.0-rc.2`.

Orange Money Mali est intégré sous l'identifiant canonique `orange_money_ml`
sur Laravel et Next.js. Les deux backends utilisent le catalogue serveur, les
montants XOF entiers, l'idempotence et le moteur financier existant. Les tokens
techniques sont chiffrés, les callbacks navigateur ne sont pas autoritaires et
les notifications déclenchent une vérification serveur-à-serveur. Le
simulateur local ne prétend pas être une sandbox officielle.

Les gates locales passent : 115 tests JS/TS, 107 tests Laravel avec 667
assertions, 2 scénarios E2E, lint, typecheck, builds et `release:check`. La
suite de conformité commune comporte désormais 30 scénarios et exécute
également un checkout Orange Money Mali par HTTP sur les deux backends avec des
bases isolées.

Prochain bloc exact : terminer toutes les gates locales, publier le correctif,
attendre la CI multi-base puis créer `v0.2.0-rc.2` uniquement si elle est
entièrement verte. Le compte marchand, la conformité KYA, le contrat, la
sandbox et la production Orange Mali restent des UAT externes.

## Jalon 13 — Parité backend

État : **validé et tagué** dans `v0.2.0-rc.1`.

Le backend Next.js autonome, ses migrations PostgreSQL, ses transactions, ses
jobs et ses routes métier sont implémentés. Laravel expose désormais aussi les
fonctions génériques de compte, notifications, profil, uploads et exploitation.
L'ADR 0006 fixe une seule autorité par profil. Le CLI génère Cloud sans PHP,
Composer ou `FANGABASE_API_ORIGIN`, limite VPS Next à PostgreSQL et produit un
client React technique lorsqu'il est choisi.

La gate de parité exécute désormais 30 scénarios par HTTP contre Laravel et
Next.js, avec une base SQLite Laravel isolée et un stockage Next.js isolé
localement. En CI, Next.js utilise une base PostgreSQL dédiée. Elle couvre
l'identité, les organisations, l'administration, les notifications, les
uploads, la finance, les webhooks, les retraits, le rapprochement, l'Outbox,
les codes d'erreur, CSRF et CORS.

Les 12 workflows du commit `0687163` sont verts, notamment PostgreSQL Next.js,
PostgreSQL/MySQL Laravel, E2E, sécurité, SAST, Docker et release.

Le correctif de conformité et de catalogue est publié et tagué
`v0.2.0-rc.1`. Les UAT Google, Stripe, FedaPay, Moneroo, payout, e-mail,
stockage distant et restauration live restent externes.

Dernière mise à jour : 2026-07-26

| Jalon                               | État               | Preuves                                                                                                             | Reste obligatoire                                           |
| ----------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 0 - Audit initial                   | Terminé            | Dépôt et outils audités, ADR 0001                                                                                   | Docker local absent, couvert en CI lorsqu'il est compatible |
| 1 - Fondation                       | Terminé            | Monorepo, CLI, contrats, Next/Laravel, health et CI                                                                 | Aucun                                                       |
| 2 - Identité et sécurité            | Terminé            | Auth persistante, vérification/reset one-shot, Outbox, sessions, replay/CSRF et Google PKCE testés                  | UAT Google réelle                                           |
| 3 - Organisations et administration | Terminé            | Organisations, invitations, policies, anti-IDOR, administration globale et audit testés                             | Aucun contrôle local restant                                |
| 4 - Infrastructure                  | Terminé localement | E-mail injectable, Outbox SQL, workers à bail et stockage privé                                                     | UAT fournisseurs et stockage distant                        |
| 5 - Finance commune                 | Terminé localement | Catalogue, crédits append-only/FEFO, abonnements et entitlements                                                    | UAT fournisseurs réels                                      |
| 6 - Fournisseurs                    | Terminé localement | Checkout serveur, Stripe, FedaPay, rapprochement et remboursements                                                  | UAT sandbox Stripe/FedaPay et contrats externes             |
| 7 - Retraits et rapprochement       | Terminé localement | Ledger, approbation, worker, polling/callback et rapprochement testés                                               | UAT payout/callback officiels                               |
| 8 - Profils de déploiement          | Terminé localement | Quatre familles CLI, artefacts sélectifs, smoke, manifeste et restauration isolée                                   | Restauration live en UAT                                    |
| 9 - Workflow design                 | Terminé localement | Workflow explicite et facultatif, sans thème FangaBase                                                              | Validation uniquement avec un design réellement fourni      |
| 10 - Skills                         | Terminé            | Sept skills validées par `quick_validate.py`                                                                        | Aucun                                                       |
| 11 - Durcissement                   | Terminé            | SQLite, PostgreSQL 17, MySQL 8.4, E2E, CodeQL et Gitleaks                                                           | Fournisseurs réels en UAT                                   |
| 12 - Release candidate              | PASS_WITH_WARNINGS | RC `0.1.0-rc.1`, licence propriétaire adoptée, E2E, builds, audits sans avis haut/critique et package reproductible | UAT externes documentées                                    |
| 13 - Parité backend                 | Terminé            | 30 scénarios comportementaux communs exécutés par HTTP contre Laravel et Next.js, bases isolées                     | Aucun contrôle local restant                                |

## État du jalon 12

- Le parcours étudiant génère réellement les profils Cloud, VPS, mutualisé et hybride dans des dossiers imbriqués.
- Le clone propre passe `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm release:check`, les 80 tests JS/TS, les quatre builds et les deux scénarios Playwright.
- Une installation Composer locale totalement neuve n'a pas abouti à cause de téléchargements Packagist nuls/corrompus et de délais réseau. Ce résultat est un échec externe documenté, pas un PASS masqué. Les workflows GitHub propres `ci-laravel` et `ci-databases` passent sur SQLite, PostgreSQL 17 et MySQL 8.4.
- Les 11 workflows du commit `bba3196` sont verts, y compris `ci-release`, `ci-docker`, `ci-security` et `ci-sast`.
- Le package RC est déterministe, exclut secrets et artefacts locaux, puis produit manifeste, SBOM CycloneDX et somme SHA-256 vérifiés.
- Docker reste facultatif et absent de ce poste. L'image Next compatible est construite et testée par `ci-docker`; aucun Docker n'est imposé au profil mutualisé.
- Les fournisseurs réels, comptes sandbox, transactions et restauration live restent des UAT externes explicitement signalées.

## Licence

La licence commerciale propriétaire est adoptée dans `LICENSE`. Mamady Traoré est l'auteur et le titulaire légal des droits, en qualité de CEO de Motechnova ; cette qualité ne désigne pas Motechnova comme titulaire distinct. Les étudiants autorisés peuvent modifier FangaBase pour créer et commercialiser leurs applications, mais ne peuvent ni partager, ni redistribuer, ni revendre FangaBase. Les composants tiers conservent leurs propres licences. Le texte ne constitue pas un avis juridique professionnel.

## Checkpoint Git

Le jalon 11 est validé au commit `6b06521`. La préparation RC et son rapport initial sont publiés jusqu'au commit `b57b485` sur `origin/main`.

## Prochain bloc exact

Publier l'intégration Orange Money Mali, attendre tous les workflows, puis
créer `v0.2.0-rc.2` s'ils sont verts. Aucune release stable n'est prévue à ce
stade.

## Règle durable du jalon 9

Le jalon 9 ne construit aucun design FangaBase. Il fournit uniquement le workflow d'intégration du design choisi par l'étudiant. Banani et les exemples frontend restent facultatifs. Responsive, accessibilité et tests s'appliquent seulement au design effectivement choisi ou fourni.
