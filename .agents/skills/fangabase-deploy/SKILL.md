---
name: fangabase-deploy
description: Pr?parer, v?rifier ou diagnostiquer un d?ploiement FangaBase Vercel, VPS Next.js, VPS Laravel, mutualis? ou hybride. Utiliser pour DNS, TLS, Nginx, workers, cron, variables, migrations, sauvegarde, restauration ou rollback.
---

# D?ployer FangaBase

1. Lire le manifeste et choisir une seule variante dans `references/runbooks.md`.
2. V?rifier toutes les variables sans afficher leurs valeurs secr?tes.
3. Construire les artefacts avec lockfiles stricts.
4. Tester migrations sur une copie, sauvegarde et restauration avant production.
5. Configurer HTTPS, pare-feu, proxy, limites, health, readiness, worker et scheduler.
6. D?ployer les migrations comme ?tape explicite; ne jamais les lancer ? chaque requ?te.
7. Ex?cuter smoke tests puis v?rifier logs et m?triques.
8. D?clencher le rollback si readiness, migration ou parcours critique ?choue.
9. Documenter versions, preuves, dur?e et actions humaines restantes.
