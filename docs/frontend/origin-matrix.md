# Matrice origines, cookies et CSRF

| Mode                 | Origines                              | Cookies                                                | Exigences                                  |
| -------------------- | ------------------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| Même domaine         | une origine HTTPS                     | `SameSite=Lax`, Secure en production, refresh HttpOnly | proxy `/api`, CSRF double-submit           |
| Sous-domaines        | origines exactes app/API              | domaine cookie parent explicite, `Lax` si même site    | HTTPS, credentials, trusted proxies        |
| Vercel + VPS         | origine Vercel exacte, URL VPS exacte | `SameSite=None; Secure`, refresh HttpOnly              | CORS credentials, CSRF, aucun wildcard     |
| Frontend + mutualisé | origine frontend exacte               | `None; Secure` si cross-site, sinon `Lax`              | cron serveur inchangé, HTTPS et CORS exact |
| Local                | localhost ports explicites            | `Lax`, Secure désactivé uniquement localement          | aucun domaine cookie, CSRF toujours actif  |

`CORS_ORIGINS` est une liste séparée par virgules et refuse `*`. `COOKIE_DOMAIN` n'est renseigné que lorsqu'un domaine parent réel est contrôlé. `COOKIE_SAME_SITE=none` implique HTTPS et cookie Secure en production. Les proxies de confiance doivent être limités à l'infrastructure réellement utilisée. Les URLs de retour OAuth et paiement restent des chemins serveur en liste blanche, jamais des URLs fournies librement par le navigateur.
