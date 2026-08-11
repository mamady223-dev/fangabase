# Progression FangaBase

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

Contrôles locaux du 2026-08-11 : 87 tests CLI, dont les sept profils et le
processus non-TTY, puis lint, typecheck, builds, tests JS/TS complets,
documentation et `pnpm release:check` verts. La recherche avec les signatures
du packageur officiel ne trouve aucun secret dans les fichiers modifiés.

## Règle durable du jalon 9

Le jalon 9 ne construit aucun design FangaBase. Il fournit uniquement le workflow d'intégration du design choisi par l'étudiant. Banani et les exemples frontend restent facultatifs. Responsive, accessibilité et tests s'appliquent seulement au design effectivement choisi ou fourni.
