# Sauvegarde et restauration

FangaBase sauvegarde un export explicite, jamais une URL de connexion. PostgreSQL utilise `pg_dump`, MySQL `mysqldump --single-transaction` et SQLite une copie cohérente hors écriture. Ajouter au même jeu fichiers privés, métadonnées distantes et configuration non secrète. Finance, comptes, organisations, droits, Outbox et audit sont indivisibles.

```console
fangabase backup --source ./export/database.dump --target ./backups/2026-07-22T120000Z --database postgres --dry-run
fangabase restore --backup ./backups/2026-07-22T120000Z --target ./restore/database.dump --environment staging --dry-run
```

Une restauration réelle exige `--environment` et `--confirm`, vérifie SHA-256, refuse d'écraser la cible et doit être journalisée par l'orchestrateur de production. Les tests restaurent uniquement dans un dossier temporaire isolé.

Le stockage de sauvegarde est chiffré, privé, à accès minimal, avec rétention configurable et tests réguliers. Le fournisseur managé répond de ses snapshots ; l'exploitant répond des exports portables, clés séparées, rétention et preuves. Aucun `.env`, jeton, clé ou mot de passe en clair n'entre dans l'archive.
