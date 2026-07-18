# D?ploiement mutualis?

1. Construire les assets localement et ex?cuter les tests.
2. Installer Composer avec `--no-dev --classmap-authoritative` localement si le serveur ne le permet pas.
3. Placer l?application hors du document root; pointer le domaine uniquement sur `apps/server/public`.
4. Cr?er `.env` hors acc?s public, g?n?rer `APP_KEY`, utiliser MySQL, SMTP et queue `database`.
5. Ex?cuter `php artisan migrate --force`, puis les caches config/routes/views.
6. Programmer `php artisan schedule:run` chaque minute. N?utiliser l?endpoint cron sign? que si le CLI est impossible.
7. Tester `/api/health`, `/api/readiness`, connexion et envoi e-mail.
8. Sauvegarder base et fichiers priv?s avant chaque release; revenir au dossier de release pr?c?dent et restaurer seulement si la migration l?exige.

Ne jamais placer `.env`, `vendor` sensible ou stockage priv? sous `public`.
