# Entrée FangaBase — exemple

Ce document est un exemple structurel. Dans un projet étudiant, chaque valeur provient d’une décision explicite et le fichier contient exactement un bloc fermé `yaml fangabase`.

```yaml fangabase
version: 1
product:
  name: Exemple étudiant
  slug: exemple-etudiant
  type: internal
  description: Exemple sans métier imposé
  locale: fr
  timezone: Africa/Bamako
  country: ML
  default_currency: XOF
architecture:
  target: vps_laravel
  frontend: react
  backend: laravel
  ui: inertia_react
  integration: inertia
deployment:
  family: vps
  docker: false
  database: postgres
  vps_variant: laravel_inertia_react
database:
  engine: postgres
  provider: postgres
email:
  provider: local_log
storage:
  provider: local_private
queue:
  provider: database
cache:
  provider: memory_dev
billing:
  modes: []
payments:
  providers: []
  default_provider: null
design:
  source: headless
features:
  organizations: true
  marketplace: false
  admin: true
  audit_log: true
  notifications: true
  uploads: true
```
