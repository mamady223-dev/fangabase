# Progression FangaBase

## Architecture Laravel + React/Inertia `0.4.0-rc.1`

État : **PASS local avec avertissements, CI requise avant toute publication**.

Deux profils intégrés s’ajoutent sans remplacer les huit profils historiques : `vps_laravel_inertia_react` et `shared_laravel_inertia_react`. Ils génèrent une seule application Laravel à la racine, React/TypeScript dans `resources/js`, une vue Blade racine et les assets Vite dans `public/build`. Inertia n’est proposé ni sur Cloud/Vercel ni en hybride.

Le questionnaire commun expose exactement cinq choix VPS et deux choix mutualisés. Les anciennes configurations restent valides ; `integration: inertia` et `ui: inertia_react` rendent le nouveau choix non ambigu. Les guides, le doctor ciblé, le smoke avec nettoyage, les déploiements PHP-FPM/mutualisé et la matrice de dix profils sont couverts par les tests.

Première UAT générée : installations Composer/pnpm vertes, migration SQLite des 13 migrations verte, 96 tests Laravel (641 assertions), 1 test React, typecheck, build Vite (777 modules), doctor ciblé et smoke auth avec nettoyage verts. PostgreSQL/MySQL restent couverts par les gates Laravel existantes et la CI.

Gates finales : 104 tests CLI, 107 tests Laravel (667 assertions), toutes les suites JS/TS, format, lint, typecheck, builds, 2 E2E et `release:check` verts. Le package vérifié contient 440 entrées, dont les templates Inertia ; son SHA-256 final est publié dans le rapport d’exécution.

Prochain bloc exact : créer le commit dédié, pousser `main`, puis vérifier les workflows obligatoires sans tag ni modification de `stable`.

## Stabilisation du générateur `0.3.0-rc.1`

Correctif post-RC : le harnais de conformité ne choisit plus un port pseudo-aléatoire et ne masque plus la sortie de `artisan serve`. Il désactive le rechargement automatique, détecte les arrêts prématurés et restitue les logs Laravel sans réessayer ni affaiblir un scénario métier.

Les diagnostics de la relance `v0.3.0-rc.2` ont isolé une réutilisation de socket keep-alive après fermeture par le serveur PHP de développement. Le client de conformité demande désormais `Connection: close`; ce réglage reste strictement limité au harnais local et CI.

État : **PASS local, CI requise avant publication**.

Le générateur accepte une configuration YAML ou un brief Markdown contenant exactement un bloc `yaml fangabase`, validé par le schéma existant. Les documents produit facultatifs sont limités à des Markdown sûrs et copiés dans `docs/product`; aucun modèle métier n’est déduit.

Les sept profils génèrent les guides racine attendus et les commandes uniformes `setup`, `doctor`, `migrate`, `dev`, `test`, `build` et `smoke:auth` selon leur architecture. La documentation des services ne contient que les choix effectifs et n’invente aucun contrat fournisseur. La gate `docs:check` vérifie la version, le clone, les prérequis par profil et l’encodage des documents maintenus. Les 72 tests CLI sont verts.

Les gates locales passent : 72 tests CLI, 107 tests Laravel avec 667 assertions, 2 scénarios Playwright, lint, typecheck, tests JS/TS, builds, `release:check`, audit sans avis haut/critique, scan de secrets et package vérifié.

Prochain bloc exact : publier le commit sur `origin/main`, attendre tous les workflows obligatoires, puis créer `v0.3.0-rc.1` et la branche `stable` sur le même commit uniquement si la CI est entièrement verte.

## Générateur de projets ciblés

État : **PASS local, validation CI requise** pour `0.3.0-rc.1`.

`pnpm create:project` crée désormais une application indépendante hors du
dépôt source. Le moteur résout un registre déclaratif, construit dans un
dossier temporaire frère, vérifie les exclusions puis effectue un déplacement
atomique. Le dry-run JSON ne crée rien; une destination non vide et les chemins
dangereux sont refusés. `--force` exige une confirmation explicite et conserve
une possibilité de rollback pendant le remplacement.

La matrice couvre sept profils : Cloud/Vercel Next autonome, VPS Next autonome,
VPS Laravel API + Next, VPS Laravel/Blade, mutualisé Laravel/Blade, hybride
Laravel + Next et hybride Laravel + React. Les quatre graphes de dépendances
distincts ont été générés dans des dossiers propres. Les installations figées
Node, migrations Laravel, lint, typecheck, tests et builds représentatifs sont
verts. Le profil Cloud KanuPay passe 43 tests générés (plus un test PostgreSQL
conditionnel), et le profil mutualisé sans paiement passe 95 tests Laravel avec
636 assertions après suppression réelle des adaptateurs et routes exclus.

Le questionnaire sépare famille de déploiement, architecture, base, e-mail,
paiement, facturation et source frontend. Le type de produit reste descriptif.
Le doctor lit le manifeste et ne vérifie PHP/Composer que pour Laravel. Les
projets contiennent README, guides, configuration, environnement minimal et
manifeste SHA-256.

Prochain bloc exact : exécuter les gates finales du dépôt, packaging et CI, puis
publier le commit du générateur. Les comptes fournisseurs, déploiements et
bases managées réelles restent des UAT externes.

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

## Génération guidée sans TTY

Le CLI utilise désormais un registre unique pour le questionnaire PowerShell,
le protocole agent, les tests et la résolution de configuration. La commande
`pnpm create:project --agent --json` retourne les questions ordonnées et
`--answers` permet une reprise déterministe avec les états `NEEDS_ANSWERS`,
`INVALID_ANSWERS` et `READY`. Le mode agent ne crée aucun fichier de projet.
Le parcours complet est documenté dans
`docs/getting-started/codex-guided-generation.md`. Le prochain bloc exact est
la validation CI de ce correctif ; aucun tag ni mouvement de `stable` n’est
prévu.

`pnpm create:project` détecte désormais automatiquement l’absence de TTY et
retourne `NEEDS_ANSWERS` sans option étudiante, sans destination et sans
écriture. La réponse est identique au mode agent explicite et ordonne à l’agent
de poser une seule question à la fois. Les parcours explicites `--config`,
`--brief`, `--answers` et génération restent séparés.

Contrôles locaux du 2026-08-11 : 97 tests CLI, dont les sept profils, la
sélection TTY/non-TTY et les processus réels config, brief et answers. Lint,
typecheck, builds, tests JS/TS complets, documentation et `pnpm release:check`
sont verts. La recherche avec les signatures du packageur officiel ne trouve
aucun secret dans les fichiers modifiés.

## Règle durable du jalon 9

Le jalon 9 ne construit aucun design FangaBase. Il fournit uniquement le workflow d'intégration du design choisi par l'étudiant. Banani et les exemples frontend restent facultatifs. Responsive, accessibilité et tests s'appliquent seulement au design effectivement choisi ou fourni.

# 2026-08-11 — Parcours étudiant guidé 0.4

- [x] `pnpm create:project` sans TTY commence par `NEEDS_PROJECT_VALIDATION` et ne demande aucune destination.
- [x] Source officielle `docs/getting-started/student-journey.md` avec les 19 états stables, transitions, actions humaines et interdictions.
- [x] Décisions `NO_GO_TEMPORAIRE` et `PIVOT` bloquées avant import/génération; `GO_CONDITIONNEL` transmet les documents au projet.
- [x] Questionnaire technique limité à une prochaine question, sans valeur choisie par l’agent; brief valide vers `READY_FOR_DRY_RUN`.
- [x] `FANGABASE_INPUT.md` ramené à un exemple contenant exactement un bloc `yaml fangabase` validable.
- [x] Relais produit enrichi et rapport final initial généré sans faux PASS.
- [x] Workflow design copié exclusivement selon `headless`, `stitch`, `banani`, `provided_mockups` ou `custom_frontend`; 10 profils préservés.
- [x] Stitch/Banani corrigés en UTF-8, matrice des architectures ajoutée et gate mojibake étendue à ces documents.
- [x] CLI : 115 tests verts; Laravel : 107 tests, 667 assertions; typecheck, lint, build et `release:check` verts.
- [x] Audit pnpm : 0 haute/critique, 2 modérées; audit Composer : 0 haute/critique, 1 faible transitive `firebase/php-jwt` via Google.
- [ ] Commit, push, CI du commit final et tag annoté `v0.4.0-rc.1`.

Prochain point exact : créer le commit du parcours guidé, pousser `main`, attendre toutes les gates CI, puis créer le tag RC uniquement si elles sont vertes.

# 2026-08-11 — Correctif de continuité du parcours agent

- [x] Incident utilisateur classé FAIL du protocole, sans faute attribuée à l’étudiant.
- [x] `NEEDS_PROJECT_VALIDATION` distingue explicitement générateur prêt et projet étudiant non généré.
- [x] Chemin absolu du workflow, premier bloc de cinq questions, instruction de continuation et réponses interdites inclus dans le JSON.
- [x] Session locale `.fangabase/session.json` persistante et ignorée par Git.
- [x] « OK », « continue », « reprendre » ou « vas-y » reprennent l’état; ils ne prouvent jamais l’achèvement.
- [x] Décisions, blocs A à H, réponses techniques, destination et preuves des gates représentés dans la session.
- [x] Génération guidée bloquée avant GO conditionnel, configuration, dry-run et confirmation.
- [x] Gate de vérité fondée sur la destination, le manifeste, la configuration, setup, doctor, migrations, tests, build, smoke et rapport final.
- [x] Tests de régression CLI ajoutés; dix profils préservés.
- [x] Parcours réel complet : génération hors dépôt, setup, 13 migrations, doctor final PASS, 96 tests Laravel (641 assertions), 1 test frontend, build Vite (777 modules), smoke auth et nettoyage PASS.
- [x] Gates locales : 122 tests CLI, 107 tests Laravel (667 assertions), suites JS/TS, lint, typecheck, builds et `release:check` verts.
- [x] Sécurité : aucun secret détecté, aucune vulnérabilité haute/critique; deux avis pnpm modérés et l’avis Composer faible transitive déjà documentés.
- [ ] Commit `fix: enforce continuous guided student journey`, push de `main` et CI.

Prochain point exact : publier uniquement le commit correctif sur `main`, attendre la CI, sans créer de tag ni modifier `stable`.

# 2026-08-11 — Liberté de continuation après validation

- [x] Cause corrigée : `NO_GO_TEMPORAIRE` ne devient plus `FAIL` et ne quitte plus FangaBase.
- [x] Nouveaux états stables : `VALIDATION_STEP_SKIPPED`, `TERRAIN_VALIDATION_DEFERRED`, `USER_OVERRIDE_UNVALIDATED`, `EXIT_CONFIRMATION_REQUIRED` et `ABANDONED`.
- [x] Session enrichie : décision et score analytiques, décision volontaire, terrain reporté, inconnues, étapes sautées, avertissements, activité FangaBase et démarrage du questionnaire technique.
- [x] Une étape sautée reste limitée à sa question; les autres questions du bloc continuent.
- [x] Un override conserve `NO_GO_TEMPORAIRE` ou `PIVOT`, exige le questionnaire technique complet et autorise seulement une génération FangaBase avec avertissements.
- [x] Sortie complète protégée par `QUITTER FANGABASE`, puis `QUITTER`; `OK` ne quitte jamais et aucun starter extérieur n’est invoqué.
- [x] Rapport d’un parcours non validé obligé de conserver « Marché non validé sur le terrain », « Développement volontaire » et « UAT terrain restante » avant `PASS_WITH_WARNINGS`.
- [x] Régressions A à F : 129 tests CLI verts; matrice des dix profils inchangée.
- [x] Gates locales : setup, format, lint, typecheck, suites JS/TS, 107 tests Laravel (667 assertions), 2 E2E, parité, builds et `release:check` verts.
- [x] Audits : 0 haute/critique; 2 avis pnpm modérés et 1 avis Composer faible transitif déjà documentés; aucun secret réel détecté.
- [ ] Commit `fix: preserve FangaBase after validation override`, push de `main` et 12 workflows.

Prochain point exact : publier le correctif sur `origin/main`, attendre les 12 workflows, sans toucher `v0.4.0-rc.1`, créer `v0.4.0-rc.2` ni modifier `stable`.
