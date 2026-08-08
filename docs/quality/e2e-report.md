# Rapport E2E

Les flux API critiques sont exercés contre Laravel et Next.js avec des bases isolées : identité, sessions, organisations, administration, facturation, paiements, retraits, webhooks, CSRF, CORS et Outbox.

Le navigateur Playwright couvre volontairement l’interface technique headless : santé nettoyée, backend indisponible, absence de liens vers les exemples et absence de secrets. Aucun design n’est créé.

- Laravel local : SQLite et fournisseurs locaux ;
- Chromium : exécuté lorsque le binaire Playwright est disponible ;
- fournisseurs réels : jamais appelés par les tests automatisés ;
- PostgreSQL et MySQL : migrations et tests exécutés dans les workflows dédiés.
