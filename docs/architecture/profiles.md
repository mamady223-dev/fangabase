# Profils de déploiement

FangaBase propose quatre choix simples. Le CLI écrit le manifeste résolu et uniquement les fichiers compatibles dans `deployment/`. Une seconde exécution est idempotente. Un fichier existant différent est signalé dans `conflicts` et n'est jamais remplacé.

| Famille      | Application                                            | Automatisé                                             | Action humaine ou limite                                                                                                |
| ------------ | ------------------------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Cloud/Vercel | Next.js sur Vercel, PostgreSQL Neon ou Supabase        | Vercel, variables, build, smoke                        | Laravel n'est pas annoncé sur Vercel. Pas de worker permanent en serverless ; choisir Hybride si Laravel fait autorité. |
| VPS          | Next, Laravel ou API Laravel + Next ; PostgreSQL/MySQL | systemd web/worker/scheduler, proxy, Docker facultatif | Configurer domaine, TLS, utilisateur, logs et sauvegardes hors site.                                                    |
| Mutualisé    | Laravel, MySQL/PostgreSQL selon l'offre                | cron borné, public root, migrations/cache              | Aucun Docker, root, systemd ou daemon. Outbox et queues tournent par petits lots cron.                                  |
| Hybride      | Next hébergé + API Laravel ailleurs                    | Vercel frontend et services Laravel                    | HTTPS, CORS/CSRF exacts et cookies Secure/HttpOnly/SameSite adaptés sont obligatoires.                                  |

Le choix ne change jamais les contrats, règles financières ni l'autorité Laravel de l'ADR 0002. `deployment.database` correspond à `database.engine`. Docker n'est généré que pour un VPS avec `deployment.docker: true`.

## Déploiement sûr

1. Injecter les secrets au runtime, jamais dans Git.
2. Construire un artefact immuable avec le lockfile strict.
3. Acquérir un verrou de déploiement, créer une sauvegarde vérifiée puis exécuter une seule fois les migrations additives.
4. Déployer progressivement, vérifier liveness puis readiness, ensuite lancer les workers.
5. En échec, revenir au code compatible précédent. Une migration destructive n'est jamais promise comme automatiquement réversible.

Les exemples Docker épinglent le runtime, séparent web et worker, évitent root, emploient des secrets runtime et un arrêt progressif. Docker étant absent ici, build, health check et scan d'image restent une UAT externe.
