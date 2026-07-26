# Rapport de release candidate - 2026-07-26

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

## Décision

La décision est `PASS_WITH_WARNINGS` car toutes les portes automatisables locales passent et seules des UAT externes explicitement documentées restent ouvertes. Le tag RC sera créé uniquement après succès des workflows du commit final ; aucune release stable ne sera publiée.
