# Rapport E2E headless

Les flux API critiques sont exercÃ©s par les tests Feature Laravel avec SQLite isolÃ©e et adaptateurs locaux : inscription, vÃ©rification e-mail, login, rotation/replay/logout, reset, organisations et IDOR, invitations/rÃ´les, suspensions, dernier SUPERADMIN, crÃ©dits/entitlements, paiement simulÃ©, retrait simulÃ©, CSRF/CORS, rate limits, webhooks et Outbox/worker.

Le navigateur Playwright ne couvre volontairement que la page technique : statut headless, health expurgÃ©, backend absent, absence de liens vers les pages exemples et absence de secrets dans le document. Aucun design n'est crÃ©Ã©.

Statuts possibles :

- local Laravel : exÃ©cutÃ© avec SQLite et fournisseurs locaux ;
- navigateur Chromium : exÃ©cutÃ© seulement si le binaire Playwright est installÃ© ;
- fournisseurs rÃ©els : jamais appelÃ©s ;
- PostgreSQL 17/MySQL 8.4 : migrations et 94 tests exÃ©cutÃ©s avec succÃ¨s dans `ci-databases`; moteurs indisponibles localement.
