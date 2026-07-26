# Démarrage rapide

## Objectif

Lancer le socle headless FangaBase et comprendre le profil généré.

## Prérequis

Node 22, pnpm 11, PHP 8.2 et Composer 2.8. Docker n’est pas requis pour ce parcours. Vérifiez avec `node --version`, `pnpm --version`, `php --version` et `composer --version`.

## Commandes

```sh
git clone https://github.com/mamady223-dev/fangabase.git
cd FangaBase
pnpm install
pnpm create:project
```

Le CLI demande le projet, la destination, le déploiement, l'architecture, la
base, l'e-mail, le paiement, la facturation, la source frontend et les
fonctionnalités communes. Le type indicatif ne crée aucun modèle métier. Un
récapitulatif des composants inclus et exclus précède toute écriture.

En non interactif :

```sh
pnpm create:project --config fangabase.config.example.yaml --destination ../mon-projet --dry-run --json
pnpm create:project --config fangabase.config.example.yaml --destination ../mon-projet --yes
cd ../mon-projet
pnpm doctor --config fangabase.config.yaml
```

Le projet est construit temporairement, vérifié puis déplacé atomiquement. Le
dépôt source, `.git`, `node_modules`, `vendor`, `dist`, les `.env` locaux et
les secrets ne sont jamais copiés. Les mises à jour utilisent des versions et
guides de migration, jamais une recopie destructive.

Pour démarrer Laravel localement, copiez `apps/server/.env.example` vers `apps/server/.env`, exécutez `php apps/server/artisan key:generate`, puis `pnpm dev:server`. Le `.env` local ne doit jamais être ajouté à Git. Dans un second terminal, lancez le smoke en remplaçant l’URL par le port réellement affiché :

```sh
pnpm fangabase:init smoke --url http://127.0.0.1:8000/api --frontend http://127.0.0.1:3000
```

La sauvegarde peut être vérifiée sans écrire avec une source d’export factice explicitement créée dans un dossier temporaire : `pnpm fangabase:init backup --source <export> --target <dossier> --database sqlite --dry-run`.

Les sources visuelles autorisées sont `headless`, `banani`, `provided_mockups` et `ai_generated`. Cette dernière ne doit être choisie que sur demande explicite. FangaBase ne fournit aucun thème officiel. Les anciennes interfaces sont disponibles facultativement dans `examples/frontend-pages`.

Erreurs fréquentes : lancer une commande depuis un autre dossier, oublier Composer, confondre `DATABASE_URL` poolée et `DIRECT_DATABASE_URL` de migration, ou utiliser une URL sans `/api`. Pour aller plus loin, lire `docs/architecture/profiles.md`, `docs/operations/runbook.md`, `docs/operations/backup-restore.md` et `docs/frontend/integration.md`.
