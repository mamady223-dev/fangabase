# D?marrage rapide

## Objectif

Lancer la d?mo FangaBase et comprendre le profil g?n?r?.

## Pr?requis

Node 22, pnpm 11, PHP 8.2 et Composer 2.8. Docker n?est pas requis pour ce parcours.

## Commandes

```sh
pnpm install --frozen-lockfile
composer install --working-dir=apps/server
pnpm fangabase:init --config fangabase.config.example.yaml
pnpm dev:web
```

R?sultat attendu : le CLI ?crit un manifeste r?solu sans valeur implicite; le site r?pond sur `http://localhost:3000` et `/api/health` renvoie `status: ok`.

Erreur fr?quente : confondre `DATABASE_URL` pool?e et `DIRECT_DATABASE_URL` de migration. Pour aller plus loin, lire `docs/architecture/profiles.md` puis le code dans `tools/cli`.
