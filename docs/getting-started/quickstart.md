# Démarrage rapide

## Objectif

Lancer le socle headless FangaBase et comprendre le profil généré.

## Prérequis

Node 22, pnpm 11, PHP 8.2 et Composer 2.8. Docker n’est pas requis pour ce parcours.

## Commandes

```sh
pnpm install --frozen-lockfile
composer install --working-dir=apps/server
pnpm fangabase:init --config fangabase.config.example.yaml
pnpm dev:web
```

Le CLI écrit un manifeste résolu avec `design.source: headless`. Le site répond sur `http://localhost:3000` par une page de statut technique et `/api/health` renvoie `status: ok`.

Les sources visuelles autorisées sont `headless`, `banani`, `provided_mockups` et `ai_generated`. Cette dernière ne doit être choisie que sur demande explicite. FangaBase ne fournit aucun thème officiel. Les anciennes interfaces sont disponibles facultativement dans `examples/frontend-pages`.

Erreur fréquente : confondre `DATABASE_URL` poolée et `DIRECT_DATABASE_URL` de migration. Pour aller plus loin, lire `docs/architecture/profiles.md` puis le code dans `tools/cli`.
