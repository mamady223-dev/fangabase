# Variables d?environnement

| Variable            | Requise      | Profils     | Exemple non secret               | D?faut / effet si absente               | Validation / rotation                     |
| ------------------- | ------------ | ----------- | -------------------------------- | --------------------------------------- | ----------------------------------------- |
| APP_ENV             | oui          | tous        | development                      | aucun                                   | enum; immuable par d?ploiement            |
| APP_URL             | oui          | tous        | https://app.example.com          | readiness rouge                         | URL HTTPS en production                   |
| PUBLIC_ORIGIN       | oui          | web/hybride | https://app.example.com          | retours paiement refus?s                | origine exacte                            |
| DATABASE_URL        | oui          | web         | postgresql://user:pass@host/db   | readiness rouge                         | protocole et h?te                         |
| DIRECT_DATABASE_URL | oui en cloud | cloud       | postgresql://user:pass@host/db   | migrations bloqu?es                     | rotation mot de passe base                |
| SESSION_SECRET      | oui          | tous        | cha?ne al?atoire 32+             | d?marrage refus?                        | rotation avec r?vocation sessions         |
| CORS_ORIGINS        | hybride      | hybride     | https://app.example.com          | aucune origine cross-site               | liste exacte, jamais `*` avec credentials |
| LOG_LEVEL           | non          | tous        | info                             | info                                    | enum debug/info/warn/error                |
| REDIS_URL           | selon profil | VPS/cloud   | rediss://user:pass@host          | queue base ou readiness selon manifeste | TLS et rotation fournisseur               |
| SENTRY_DSN          | non          | tous        | https://public@example.invalid/1 | observabilit? locale                    | DSN projet, sans PII                      |

Les cl?s fournisseurs restent absentes des exemples. Apr?s rotation : mettre ? jour le secret du profil, red?ployer, r?voquer l?ancien, v?rifier readiness et un appel sandbox.
