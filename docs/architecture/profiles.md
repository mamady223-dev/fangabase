# Profils de déploiement

FangaBase propose quatre familles. `pnpm create:project` résout un registre déclaratif de composants, construit un nouveau projet hors du dépôt source, vérifie ses exclusions puis le déplace atomiquement. Le manifeste contient les choix, les fichiers produits et leurs SHA-256.

| Famille      | Application                                                                                    | Automatisé                                                      | Action humaine ou limite                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Cloud/Vercel | Next.js sur Vercel, PostgreSQL Neon ou Supabase                                                | Vercel, variables, build, smoke                                 | Laravel n’est pas annoncé sur Vercel. Pas de worker permanent en serverless ; choisir Hybride si Laravel fait autorité. |
| VPS          | Next, Laravel/Blade, Laravel/React Inertia ou API Laravel + frontend séparé ; PostgreSQL/MySQL | systemd web/worker/scheduler, PHP-FPM, proxy, Docker facultatif | Configurer domaine, TLS, utilisateur, logs et sauvegardes hors site.                                                    |
| Mutualisé    | Laravel/Blade ou Laravel/React Inertia, MySQL/PostgreSQL selon l’offre                         | cron borné, public root, migrations/cache, assets Vite compilés | Aucun Docker, root, systemd, daemon ou serveur Node permanent. Outbox et queues tournent par petits lots cron.          |
| Hybride      | Next ou React hébergé + API Laravel ailleurs                                                   | frontend et services Laravel séparés                            | HTTPS, CORS/CSRF exacts et cookies Secure/HttpOnly/SameSite adaptés sont obligatoires.                                  |

Une seule autorité backend est incluse. Cloud et VPS Next n’embarquent ni PHP, ni Composer, ni Laravel. Les profils Laravel n’embarquent pas le backend Next autonome. Hybride garde Laravel comme autorité et sépare le frontend. Le choix du produit reste descriptif et n’impose aucun métier ou design.

## Matrice des dix profils

| Identifiant                    | Famille      | Structure                                              |
| ------------------------------ | ------------ | ------------------------------------------------------ |
| `cloud_next`                   | Cloud/Vercel | Next.js autonome                                       |
| `vps_next`                     | VPS          | Next.js autonome                                       |
| `vps_laravel_blade`            | VPS          | Laravel + Blade intégré                                |
| `vps_laravel_inertia_react`    | VPS          | Laravel + React/Inertia intégré, une seule application |
| `vps_laravel_api_next`         | VPS          | Laravel API + Next.js séparé, deux applications        |
| `vps_laravel_api_react`        | VPS          | Laravel API + React/Vite séparé, deux applications     |
| `shared_laravel_blade`         | Mutualisé    | Laravel + Blade intégré                                |
| `shared_laravel_inertia_react` | Mutualisé    | Laravel + React/Inertia intégré, une seule application |
| `hybrid_laravel_api_next`      | Hybride      | Laravel API + Next.js séparé                           |
| `hybrid_laravel_api_react`     | Hybride      | Laravel API + React/Vite séparé                        |

Dans les deux profils Inertia, Laravel sert les pages sur la même origine, les assets React sont compilés dans `public/build` et SSR reste désactivé. Node sert au développement et au build, pas au service de production.

## Déploiement sûr

1. Injecter les secrets au runtime, jamais dans Git.
2. Construire un artefact immuable avec le lockfile strict.
3. Acquérir un verrou de déploiement, créer une sauvegarde vérifiée puis exécuter une seule fois les migrations additives.
4. Déployer progressivement, vérifier liveness puis readiness, ensuite lancer les workers.
5. En échec, revenir au code compatible précédent. Une migration destructive n’est jamais promise comme automatiquement réversible.

Les exemples Docker épinglent le runtime, séparent web et worker, évitent root, emploient des secrets runtime et un arrêt progressif. Docker étant absent ici, build, health check et scan d’image restent une UAT externe.
