# Couverture CI

Les workflows séparés couvrent contrats/parité, Laravel, web, templates, documentation et sécurité. `ci-databases.yml` ajoute PostgreSQL/MySQL. `ci-sast.yml` ajoute CodeQL et Gitleaks. Le navigateur Playwright s'exécute via `pnpm test:e2e` après build et installation Chromium dans un environnement équipé.

Chaque job a `contents: read`; seul CodeQL reçoit `security-events: write`. Aucun secret fournisseur réel n'est nécessaire. Les identifiants de services relationnels sont éphémères et limités au runner.
