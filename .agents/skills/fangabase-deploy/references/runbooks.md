# Runbooks

Chaque profil exige : build immuable, migrations explicites, health/readiness, worker/scheduler, TLS, logs, sauvegarde chiffr?e, restauration v?rifi?e et rollback. Vercel utilise cron born?; VPS utilise systemd/Supervisor; mutualis? utilise cron CLI ou endpoint secret en dernier recours; hybride garde webhooks et finance sur Laravel.
