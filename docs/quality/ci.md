# Couverture CI

Onze workflows séparés couvrent contrats/parité, Laravel, web, templates, documentation, sécurité, bases, SAST, E2E, Docker optionnel et release. Sur le commit `bba3196`, les onze exécutions sont terminées avec succès.

`ci-databases` valide PostgreSQL 17 et MySQL 8.4. `ci-sast` exécute CodeQL et Gitleaks. `ci-e2e` utilise Playwright. `ci-docker` construit et health-checke uniquement l'image Next compatible; Docker n'est pas requis pour le profil mutualisé. `ci-release` installe les dépendances figées sans scripts, vérifie le package et son SBOM, publie l'artefact puis atteste sa provenance.

Les actions tierces sont épinglées par SHA. Chaque job conserve des permissions minimales; seules les capacités nécessaires à CodeQL et à l'attestation sont accordées. Aucun secret fournisseur réel n'est nécessaire. Les identifiants de services relationnels sont éphémères et limités au runner.
