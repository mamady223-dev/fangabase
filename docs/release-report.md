# Rapport de release candidate - 2026-08-11

## Préparation de `0.4.0-rc.1` — Laravel + React/Inertia intégré

Décision locale : **PASS_WITH_WARNINGS**, CI du commit publié requise.

FangaBase ajoute deux profils constitués d’une seule application Laravel : VPS et hébergement mutualisé avec React 19, Inertia 2, TypeScript 5.8 et Vite 7. Laravel 12 reste l’unique autorité métier. Les profils Next.js et React/Vite séparés ne sont ni remplacés ni transformés.

La sortie possède un unique environnement racine, ne contient aucun `apps/server`, `apps/web`, frontend séparé, variable Next.js ou réglage CORS cross-origin. Le middleware web conserve sessions Laravel, cookies HttpOnly, CSRF strict, policies et validation serveur. Les props Inertia sont filtrées et les noms `VITE_*` susceptibles d’exposer un secret sont refusés.

UAT locale du profil VPS : installations verrouillées vertes ; 13 migrations SQLite ; 96 tests Laravel et 641 assertions ; 1 test React ; typecheck ; build Vite de 777 modules avec manifeste ; doctor ciblé ; smoke auth complet et nettoyage local verts. SSR reste désactivé et aucun serveur Node permanent n’est requis en production.

Gates du dépôt : 104 tests CLI, 107 tests Laravel et 667 assertions, toutes les suites JS/TS, format, lint, typecheck, builds, 2 scénarios E2E et `release:check` verts. L’archive vérifiée `fangabase-0.4.0-rc.1.zip` contient 440 entrées ; son SHA-256 final est publié dans le rapport d’exécution.

Avertissements connus : Google OAuth, SMTP/Resend/Brevo et fournisseurs de paiement exigent des comptes réels ; Moneroo reste `NEEDS_PROVIDER_CONTRACT` ; Orange Money Mali exige contrat marchand et sandbox officielle ; Docker/TLS/VPS et contraintes propres à chaque hébergeur mutualisé restent des UAT externes. L’audit Composer conserve l’avis faible déjà hérité de `firebase/php-jwt` via `google/apiclient`, sans avis haut ou critique.

Aucun tag `0.4.0` ne doit être créé et la branche `stable` ne doit pas être modifiée dans ce lot.

## Stabilisation finale de `0.3.0-rc.1`

Correctif post-RC : les exécutions supplémentaires sur le tag et `stable` ont révélé une fermeture intermittente du serveur Laravel de test. Le harnais utilise désormais un port libre fourni par le système, lance `artisan serve --no-reload --tries=1`, capture sa sortie et expose son état exact en cas d’échec. Aucun retry HTTP ni assouplissement de scénario n’a été ajouté.

Les logs de `v0.3.0-rc.2` ont confirmé que Laravel restait actif et traitait la requête pendant la fermeture de socket. Le client Node ne réutilise plus les connexions du serveur PHP de développement (`Connection: close`). Cette adaptation ne concerne ni les contrats HTTP de production ni le code métier.

Décision locale : **PASS_WITH_WARNINGS, CI et UAT externes requises**.

Le parcours distingue les prérequis Next.js et Laravel. La commande canonique est `git clone https://github.com/mamady223-dev/fangabase.git FangaBase`. Le CLI importe un brief déterministe par `--brief` et des documents produit Markdown contrôlés sans générer d’entités métier.

Les projets disposent des guides et commandes post-génération uniformes. `CONFIGURATION_SERVICES.md` est construit uniquement depuis les services sélectionnés. Moneroo reste `NEEDS_PROVIDER_CONTRACT` et non validé en sandbox. Le smoke d’identité local refuse la production et n’ajoute aucun endpoint public.

Résultats locaux : `docs:check`, format, lint, typecheck, tests JS/TS, builds et `release:check` verts; 72 tests CLI, 107 tests Laravel avec 667 assertions et 2 scénarios Playwright verts. Le scan ciblé ne trouve aucun secret réel. Le package RC contient 408 entrées et sa vérification croisée passe.

Le tag `v0.3.0-rc.1` et la branche `stable` restent strictement conditionnés au succès de tous les workflows obligatoires du commit publié.

L’audit pnpm ne signale plus aucune vulnérabilité haute ou critique après épinglage des versions corrigées de `brace-expansion`, `js-yaml` et `nanoid`; deux avis modérés restent documentaires au seuil de release.

La première CI du commit `349ca1c` a détecté de nouveaux avis Composer publiés en août 2026. Guzzle est passé à 7.15.3 et League CommonMark à 2.9.0; l’audit Composer ne conserve qu’un avis faible explicitement toléré par la gate. Le SHA invalide de l’action pnpm ajouté à `ci-docs` a été remplacé par le SHA déjà vérifié dans les autres workflows.

## Préparation de `0.3.0-rc.1` — générateur ciblé

Décision provisoire : **PASS_WITH_WARNINGS, CI requise**.

Le dépôt FangaBase reste la source complète. `pnpm create:project` produit un
nouveau dossier indépendant contenant une seule autorité backend et les seuls
frontends, déploiements, variables et adaptateurs sélectionnés. Les sorties
sont préparées temporairement, inventoriées avec SHA-256 et déplacées
atomiquement. `.git`, dépendances installées, artefacts, `.env` locaux et
secrets sont exclus.

La matrice automatisée couvre sept profils et 70 tests CLI. Les graphes
distincts ont aussi été installés proprement : Next autonome avec lockfile
figé, Laravel/Blade avec Composer et migrations, frontend Next séparé et
frontend React séparé. KanuPay Cloud passe typecheck, 43 tests générés et build
Next. Le mutualisé sans paiement passe 95 tests Laravel et 636 assertions; les
adaptateurs Stripe, FedaPay et Orange Money Mali ainsi que leurs routes sont
absents, tandis que la migration historique reste conservée. React passe son
lint, typecheck, test technique et build Vite.

Les UAT externes ne changent pas : comptes et contrats fournisseurs, bases
managées, déploiements, callbacks HTTPS et restauration live. Moneroo reste
`NEEDS_PROVIDER_CONTRACT`; Orange Money Mali reste désactivé sans identifiants
et contrat officiels.

## Préparation de `0.2.0-rc.2` — Orange Money Mali

Décision locale : **PASS_WITH_WARNINGS, CI REQUISE AVANT TAG**.

Orange Money Mali est intégré comme fournisseur spécifique
`orange_money_ml`, sans reprendre le métier, les contrôleurs, les modèles, les
pages ou les textes du projet de référence. Seul le flux technique observé a
servi de preuve. Les URL d'API restent vides par défaut et doivent être
confirmées par le contrat marchand Orange Mali.

Laravel et Next.js possèdent chacun un adaptateur isolé, un cache OAuth fondé
sur `expires_in`, un stockage chiffré des tokens nécessaires au statut et un
simulateur sans secret réel. Le checkout utilise le catalogue serveur et XOF
en entier. Les notifications, retours et annulations ne sont jamais
autoritaires et déclenchent une vérification serveur-à-serveur. La suite
comportementale commune comporte 30 scénarios, dont Orange Money Mali par HTTP
contre les deux backends avec bases isolées.

Les gates locales passent : 115 tests JS/TS verts, un test PostgreSQL
conditionnel réservé à la CI, 107 tests Laravel et 667 assertions, 2 scénarios
E2E, conformité HTTP commune sur 30 scénarios par backend, lint, typecheck,
builds et `release:check`.

La sandbox et la production Orange Mali, le compte marchand, la conformité
KYA, le contrat, les identifiants et toute signature officielle restent
**UAT EXTERNE REQUISE**. Le tag `v0.2.0-rc.2` reste conditionné à toutes les
gates locales et CI.

Décision locale du jalon 13 : **PASS_WITH_WARNINGS, CI REQUISE AVANT TAG**.
La suite de conformité exécute les 29 mêmes scénarios par HTTP contre Laravel
et Next.js avec des bases isolées. Elle remplace la comparaison d'enums comme
preuve de parité. Les enums restent testés séparément comme contrat.

Monero Wallet RPC et le parcours XMR ont été retirés du produit. La migration
historique additive est conservée pour ne supprimer aucune preuve financière.
Moneroo, plateforme africaine d'orchestration de paiements, reste au catalogue
avec le statut `NEEDS_PROVIDER_CONTRACT` : son contrat, l'accès marchand et une
éventuelle transition vers Orqex doivent être vérifiés. Aucun endpoint, SDK,
webhook ou secret Moneroo n'a été inventé.

## Préparation de `0.2.0-rc.1` — jalon 13

Statut courant : **EN VALIDATION**.

Le backend Next.js n'est plus un proxy obligatoire : il possède une
persistance PostgreSQL versionnée, des transactions, les fonctions métier
génériques, une Outbox et des jobs. Laravel reste l'autorité des profils
Laravel et hybride. L'ADR 0006 garantit une seule autorité par application.

Résultats locaux : conformité commune verte sur 29 scénarios par backend,
PHPUnit vert avec 96 tests et 638 assertions, deux scénarios Playwright verts,
lint, typecheck et builds verts. `ci-next-postgres` exécute aussi la conformité
avec la persistance PostgreSQL avant le tag.

La décision finale et le SHA-256 du package seront inscrits après les gates et
la CI. Aucune UAT externe n'est requalifiée comme automatisée.

Statut global : **PASS_WITH_WARNINGS**, sous réserve de la CI du commit final.

La release candidate `0.1.0-rc.1` est techniquement reproductible. La gate juridique est close : `LICENSE` désigne Mamady Traoré comme auteur et titulaire légal des droits, en qualité de CEO de Motechnova, sans présenter Motechnova comme titulaire distinct. Toutes les gates locales obligatoires passent ; le tag reste conditionné au succès des workflows du commit final.

## Résultats vérifiés

| Gate                                         | Résultat          | Preuve                                                                            |
| -------------------------------------------- | ----------------- | --------------------------------------------------------------------------------- |
| Installation JS figée en clone propre        | PASS              | `pnpm install --frozen-lockfile --ignore-scripts`                                 |
| Format, lint, typecheck, tests et builds     | PASS local        | 101 tests JS/TS verts, 1 PostgreSQL conditionnel réservé à la CI; builds verts    |
| Laravel local SQLite                         | PASS              | 96 tests, 638 assertions                                                          |
| Laravel CI multi-base                        | PASS              | `ci-laravel` et `ci-databases`; SQLite, PostgreSQL 17 et MySQL 8.4                |
| E2E headless                                 | PASS              | 2 scénarios Playwright localement en clone propre et `ci-e2e`                     |
| Charge worker bornée                         | PASS local        | 101 messages traités une fois par deux workers alternés; 1 test, 5 assertions     |
| Contrats et parité                           | PASS local        | 29 scénarios communs par HTTP sur chacun des deux backends et bases isolées       |
| Skills                                       | PASS              | sept validations `quick_validate.py`                                              |
| Secrets/SAST                                 | PASS              | scan dépôt/archive, Gitleaks, CodeQL et `ci-security`                             |
| Dépendances hautes/critiques                 | PASS au seuil     | aucune alerte haute/critique ; une npm modérée et une Composer faible documentées |
| Package RC                                   | PASS              | archive déterministe, SHA-256, manifeste et SBOM CycloneDX; `ci-release` vert     |
| Docker compatible                            | PASS CI           | image Next construite, exécutée sans root et health-checkée par `ci-docker`       |
| Fournisseurs réels                           | UAT EXTERNE       | aucun secret, compte ou paiement réel utilisé; matrice dédiée                     |
| Installation Composer locale en clone propre | UAT EXTERNE       | échec réseau Packagist avec archives nulles/corrompues; CI propre verte           |
| Licence définitive                           | PASS documentaire | `LICENSE`, titulaire Mamady Traoré, droits et restrictions explicites             |

## Packaging et parcours étudiant

Le CLI génère sans erreur les quatre familles Cloud, VPS, mutualisé et hybride, y compris vers une destination imbriquée. Chaque sortie conserve le profil headless et uniquement les artefacts compatibles. Le script de release trie les chemins, fixe les métadonnées ZIP, exclut les fichiers locaux/interdits, recherche les motifs de secrets et vérifie l'archive indépendamment. Les assistants Stitch et Banani restent présents comme sources facultatives à activation explicite; aucun design n'a été lancé ou inventé.

## Sécurité et chaîne d'approvisionnement

Les actions GitHub sont épinglées par SHA. Le workflow release utilise une installation figée sans scripts, publie le package vérifié et produit une attestation de provenance. Les invariants auth, OAuth, sessions, CSRF, organisations, uploads, webhooks, finance, payouts, Outbox et PII restent couverts. Aucun secret réel n'a été ajouté.

## UAT externes

Les comptes sandbox Stripe/FedaPay, les contrats payout, Moneroo, les fournisseurs e-mail/stockage réels et une restauration live exigent une infrastructure ou des comptes humains externes. Moneroo reste `NEEDS_PROVIDER_CONTRACT` et n'est pas validé en sandbox ; aucun endpoint, SDK, webhook ou secret n'est inventé. Docker n'est jamais requis pour l'hébergement mutualisé.

## Licence

Les étudiants autorisés peuvent modifier FangaBase et commercialiser les applications qu'ils créent. Le partage, la redistribution et la revente de FangaBase restent interdits. Les composants tiers demeurent soumis à leurs propres licences. La licence ne constitue pas un avis juridique professionnel.

## Correctif de génération guidée Codex

Le questionnaire possède maintenant une source unique utilisée par le parcours
PowerShell et le protocole JSON non interactif. `create:project --agent --json`
est sans écriture, expose des identifiants stables, les conditions et les règles
de compatibilité, puis accepte des réponses partielles avec `--answers`. Une
configuration complète produit le même objet que le parcours interactif et
doit encore passer par le dry-run, la destination séparée et la confirmation
explicite avant génération. Aucun backend, paiement, design ou artefact de
déploiement n’a été modifié. Aucun tag ni mouvement de `stable` n’est prévu.

Preuves locales du 2026-08-11 : 97 tests CLI verts, matrice des sept profils
verte, suite JS/TS complète verte, lint, typecheck, six builds, contrôle
documentaire et `pnpm release:check` verts. Le test de processus lance
réellement le mode agent sans TTY et vérifie un dossier de travail vide après
exécution. La recherche des signatures de secrets du packageur ne retourne
aucune correspondance dans le périmètre modifié. Gitleaks reste assuré par la
CI, son exécutable n’étant pas installé localement.

Le correctif suivant rend le protocole transparent pour l’étudiant : la
commande nue `pnpm create:project` retourne automatiquement `NEEDS_ANSWERS`
sans TTY, exactement comme `--agent --json`. Elle ne résout aucune valeur par
défaut, n’écrit rien et ne demande pas la destination. `next_action` impose une
seule question à la fois et reporte la destination après `READY`. Les tests CLI
passent désormais à 97, avec détection TTY/non-TTY, égalité des deux sorties et
régressions process pour config, brief, answers et les sept profils.

## Décision

La décision est `PASS_WITH_WARNINGS` car toutes les portes automatisables locales passent et seules des UAT externes explicitement documentées restent ouvertes. Le tag RC sera créé uniquement après succès des workflows du commit final ; aucune release stable ne sera publiée.

# Release candidate 0.4.0-rc.1 — parcours étudiant guidé

## Décision locale

`PASS_WITH_WARNINGS` : toutes les gates locales obligatoires exécutées sont vertes. Les avertissements restants sont des UAT externes ou des avis de dépendances sans sévérité haute/critique. Le PASS final et le tag restent conditionnés à la CI du commit publié.

## Preuves

- Commande étudiante exacte : `pnpm create:project` → `NEEDS_PROJECT_VALIDATION`, aucun prompt de destination, aucune écriture.
- CLI : 13 fichiers de tests, 115 tests verts, dont 10 profils, import produit, décisions bloquantes et sélection exclusive du workflow design.
- Laravel SQLite : 107 tests, 667 assertions.
- `pnpm install --frozen-lockfile`, format, documentation/mojibake, lint, typecheck, tests workspace, builds et `pnpm release:check` : verts.
- Package RC : 444 entrées après indexation des nouveaux fichiers; le SHA-256 final est recalculé et communiqué séparément après le commit afin de ne pas créer une référence circulaire dans l’archive.
- Recherche de secrets : uniquement les motifs de détection présents dans les tests/scripts, aucun secret réel détecté.
- pnpm : 2 avis modérés, aucune vulnérabilité haute/critique.
- Composer : un avis faible `firebase/php-jwt` (`CVE-2025-45769`), dépendance transitive de l’adaptateur Google; aucune vulnérabilité haute/critique.

## UAT externes

- Stitch : compte, clé, réseau, MCP/SDK et écrans réels à valider lors d’une activation explicite.
- Banani : compte, forfait, MCP/exports et connexion réelle non validés; statut `UAT_EXTERNE`.
- Google OAuth, Orange Money Mali, Moneroo et tout fournisseur marchand : identifiants/contrats/sandbox réels requis avant production.
- Matrices PostgreSQL/MySQL, Docker et E2E distant : couvertes par la CI obligatoire du commit final; ne conditionnent le test local SQLite déjà vert.

## Release

- Branche `stable` : ne pas modifier.
- Version stable : ne pas publier.
- Tag `v0.4.0-rc.1` : autorisé uniquement après push du commit final et CI entièrement verte.

# Correctif post-`v0.4.0-rc.1` — continuité du parcours agent

Décision locale : **PASS_WITH_WARNINGS, CI requise avant clôture**.

Cause exacte : le premier protocole `NEEDS_PROJECT_VALIDATION` décrivait une action future, mais ne fournissait pas le bloc A, n’écrivait aucun état persistant et n’exposait aucune preuve machine interdisant une conclusion prématurée. Le dépôt du générateur pouvait être confondu avec un projet étudiant.

Correction : le JSON distingue désormais `generator_ready` et `student_project_ready`, impose la continuation dans le même tour, fournit le workflow absolu et les cinq questions, persiste le parcours dans `.fangabase/session.json`, bloque toute génération prématurée et calcule `completion_claim_allowed` uniquement depuis les artefacts et gates réellement enregistrés.

Preuve réelle : un profil Laravel/Inertia a été généré hors du dépôt puis a passé `pnpm setup`, 13 migrations SQLite, le doctor final, 96 tests Laravel (641 assertions), 1 test frontend, le build Vite (777 modules) et le smoke d’authentification avec nettoyage. La session n’a retourné `PASS` qu’après enregistrement du rapport final existant. Le générateur autorise explicitement le build d’`esbuild` avec `allowBuilds` sous pnpm 11 et les guides utilisent `pnpm run doctor` pour éviter la commande interne homonyme de pnpm.

Gates du dépôt : 122 tests CLI et 107 tests Laravel (667 assertions), suites JS/TS, lint, typecheck, builds et `release:check` verts. Aucun secret réel n’a été détecté. Les audits conservent uniquement deux avis pnpm modérés et l’avis Composer faible transitive `firebase/php-jwt` déjà documenté; aucun avis haut ou critique.

Le tag `v0.4.0-rc.1` est préservé et ne sera jamais déplacé. Aucun `v0.4.0-rc.2` ne sera créé dans ce lot sans test réel complet, CI verte et confirmation explicite de l’utilisateur. La branche `stable` reste inchangée.
