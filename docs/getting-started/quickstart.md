# Démarrage rapide

## Objectif

Lancer le socle headless FangaBase et comprendre le profil généré.

## Prérequis

Node 22, pnpm 11, PHP 8.2 et Composer 2.8. Docker n’est pas requis pour ce parcours. Vérifiez avec `node --version`, `pnpm --version`, `php --version` et `composer --version`.

## Commandes

```sh
pnpm setup
pnpm doctor
pnpm fangabase:init --config fangabase.config.example.yaml --dry-run
pnpm fangabase:init --config fangabase.config.example.yaml
php apps/server/artisan migrate --force
pnpm release:check
pnpm dev:web
```

Le CLI écrit `fangabase.config.yaml` et les fichiers compatibles sous `deployment/`. Le dry-run permet de les inspecter avant écriture. Le manifeste résolu conserve `design.source: headless`. Le site répond sur `http://localhost:3000` par une page de statut technique et `/api/health` renvoie `status: ok`.

Pour démarrer Laravel localement, copiez `apps/server/.env.example` vers `apps/server/.env`, exécutez `php apps/server/artisan key:generate`, puis `pnpm dev:server`. Le `.env` local ne doit jamais être ajouté à Git. Dans un second terminal, lancez le smoke en remplaçant l’URL par le port réellement affiché :

```sh
pnpm fangabase:init smoke --url http://127.0.0.1:8000/api --frontend http://127.0.0.1:3000
```

La sauvegarde peut être vérifiée sans écrire avec une source d’export factice explicitement créée dans un dossier temporaire : `pnpm fangabase:init backup --source <export> --target <dossier> --database sqlite --dry-run`.

Les sources visuelles autorisées sont `headless`, `banani`, `provided_mockups` et `ai_generated`. Cette dernière ne doit être choisie que sur demande explicite. FangaBase ne fournit aucun thème officiel. Les anciennes interfaces sont disponibles facultativement dans `examples/frontend-pages`.

Erreurs fréquentes : lancer une commande depuis un autre dossier, oublier Composer, confondre `DATABASE_URL` poolée et `DIRECT_DATABASE_URL` de migration, ou utiliser une URL sans `/api`. Pour aller plus loin, lire `docs/architecture/profiles.md`, `docs/operations/runbook.md`, `docs/operations/backup-restore.md` et `docs/frontend/integration.md`.
