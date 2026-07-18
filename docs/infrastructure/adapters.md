# Adaptateurs d’infrastructure

## E-mail transactionnel

`MAIL_PROVIDER` accepte `local`, `resend`, `brevo` ou `smtp`. `local` est la valeur de développement et n’effectue aucun appel réseau. Un fournisseur distant sans configuration complète renvoie `PROVIDER_DISABLED` sans connexion sortante. Les clés restent exclusivement côté serveur.

| Fournisseur | Configuration requise                 | Idempotence                 | UAT externe |
| ----------- | ------------------------------------- | --------------------------- | ----------- |
| Resend      | `RESEND_API_KEY`, `MAIL_FROM_ADDRESS` | En-tête fournisseur         | En attente  |
| Brevo       | `BREVO_API_KEY`, `MAIL_FROM_ADDRESS`  | Clé Outbox transmise        | En attente  |
| SMTP        | `SMTP_DSN`, `MAIL_FROM_ADDRESS`       | Déduplication Outbox locale | En attente  |

Le worker `php artisan fangabase:mail-worker --once --limit=25` convient au cron et au serverless. Sans `--once`, il fonctionne en continu sous systemd. Chaque prise possède un bail, les baux expirés sont repris, les erreurs temporaires utilisent un backoff exponentiel avec jitter et les erreurs terminales passent en `DEAD`. Les tentatives sont conservées dans `email_job_attempts`. Un replay `DEAD` doit fournir acteur et motif et produit un audit.

SQLite est supporté en développement mono-worker. Les garanties de concurrence avec plusieurs workers doivent être recettées sur PostgreSQL ou MySQL. Redis est optionnel et n’est pas requis par l’Outbox SQL.

## Stockage privé

Le contrat impose préfixe locataire, clé générée côté serveur, limite de taille, MIME détecté égal au MIME déclaré, liste blanche, SHA-256 et autorisation explicite avant suppression. Le stockage local crée des fichiers `0600` hors racine publique et signe des URLs d’une durée maximale d’une heure.

| Adaptateur       | Privé            | URL signée   | Streaming    | Chiffrement serveur | État                            |
| ---------------- | ---------------- | ------------ | ------------ | ------------------- | ------------------------------- |
| Local            | Oui              | Oui          | Oui          | Non                 | Testé localement                |
| S3               | Oui              | Oui          | Selon client | Oui selon bucket    | Port injectable, UAT SDK/compte |
| Cloudflare R2    | Oui              | Oui          | Selon client | Géré                | Port S3 injectable, UAT compte  |
| Cloudinary       | Selon politique  | Selon client | Selon client | Géré                | Port injectable, UAT compte     |
| Supabase Storage | Oui selon bucket | Oui          | Selon client | Géré                | Port injectable, UAT compte     |

Les adaptateurs distants utilisent `RemoteObjectClient`; aucun SDK absent n’est simulé. Le profil doit injecter le client officiel et refuser de démarrer si ses variables obligatoires manquent.

## Exploitation et reprise

- Sur VPS, installer `ops/systemd/fangabase-mail-worker.service`, fournir `/etc/fangabase/server.env`, puis activer le service.
- En mutualisé, exécuter chaque minute `php artisan schedule:run`; le verrou évite le chevauchement.
- En serverless, invoquer `fangabase:mail-worker --once --limit=25` par ordonnanceur.
- Sauvegarder la base et le stockage privé ensemble. Tester périodiquement une restauration dans un environnement isolé, vérifier les hash SHA-256, puis seulement basculer le trafic.
- Sur incident fournisseur, conserver l’Outbox, corriger la configuration, vérifier les métriques de statuts, puis rejouer uniquement les `DEAD` audités. Ne jamais éditer leur payload à la main.

Références officielles : [Resend](https://resend.com/docs/api-reference/emails/send-email), [Brevo](https://developers.brevo.com/reference/send-transac-email), [Symfony Mailer](https://symfony.com/doc/7.2/mailer.html), [AWS S3](https://docs.aws.amazon.com/sdk-for-php/v3/developer-guide/s3-presigned-url.html), [Cloudflare R2](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [Cloudinary](https://cloudinary.com/documentation/authentication_signatures), [Supabase Storage](https://supabase.com/docs/reference/php/storage-from-createsignedurl).
