# Brief d’architecture FangaBase

Le brief reste descriptif : il sélectionne une architecture et des composants, sans inventer le métier du produit. Les anciens briefs restent valides.

Pour une application Laravel + React intégrée avec Inertia/Vite :

```yaml
deployment:
  family: vps
  vps_variant: laravel_inertia_react

architecture:
  target: vps_laravel
  backend: laravel
  frontend: react
  integration: inertia
  ui: inertia_react
```

Sur hébergement mutualisé, utilisez `deployment.family: shared` avec la même section `architecture`. Cette architecture forme une seule application Laravel. Les profils `laravel_api_next` et `laravel_api_react` restent deux applications séparées.
