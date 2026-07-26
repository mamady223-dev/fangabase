# Rapport de release candidate - 2026-07-26

Statut global : **PASS_WITH_WARNINGS**, sous réserve de la CI du commit final.

La release candidate `0.1.0-rc.1` est techniquement reproductible. La gate juridique est close : `LICENSE` désigne Mamady Traoré comme auteur et titulaire légal des droits, en qualité de CEO de Motechnova, sans présenter Motechnova comme titulaire distinct. Toutes les gates locales obligatoires passent ; le tag reste conditionné au succès des workflows du commit final.

## Résultats vérifiés

| Gate                                         | Résultat          | Preuve                                                                            |
| -------------------------------------------- | ----------------- | --------------------------------------------------------------------------------- |
| Installation JS figée en clone propre        | PASS              | `pnpm install --frozen-lockfile --ignore-scripts`                                 |
| Format, lint, typecheck, tests et builds     | PASS              | `pnpm release:check`; 80 tests JS/TS; quatre builds                               |
| Laravel local SQLite                         | PASS              | 95 tests, 625 assertions; `migrate:fresh` sur SQLite mémoire                      |
| Laravel CI multi-base                        | PASS              | `ci-laravel` et `ci-databases`; SQLite, PostgreSQL 17 et MySQL 8.4                |
| E2E headless                                 | PASS              | 2 scénarios Playwright localement en clone propre et `ci-e2e`                     |
| Charge worker bornée                         | PASS local        | 101 messages traités une fois par deux workers alternés; 1 test, 5 assertions     |
| Contrats et parité                           | PASS              | 8 tests de contrats et 1 test de parité                                           |
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

Les comptes sandbox Stripe/FedaPay, les contrats payout, le wallet RPC Monero, les fournisseurs e-mail/stockage réels et une restauration live exigent une infrastructure ou des comptes humains externes. Ils restent visibles et ne sont pas présentés comme validés. Docker n'est jamais requis pour l'hébergement mutualisé.

## Licence

Les étudiants autorisés peuvent modifier FangaBase et commercialiser les applications qu'ils créent. Le partage, la redistribution et la revente de FangaBase restent interdits. Les composants tiers demeurent soumis à leurs propres licences. La licence ne constitue pas un avis juridique professionnel.

## Décision

La décision est `PASS_WITH_WARNINGS` car toutes les portes automatisables locales passent et seules des UAT externes explicitement documentées restent ouvertes. Le tag RC sera créé uniquement après succès des workflows du commit final ; aucune release stable ne sera publiée.
