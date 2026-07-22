# Rapport de charge bornée et workers

Le test `WorkerLoadTest` injecte 100 e-mails locaux en attente et un job avec bail expiré. Deux instances de worker alternent des lots de 10 jusqu'au drainage. Les invariants vérifiés sont : 101 statuts `SENT`, exactement 101 tentatives, reprise du bail expiré et absence de retraitement après drainage.

Les suites existantes couvrent aussi idempotence concurrente simulée, replay de session, réservations de crédits sans double débit, paiements/retraits simulés, transitions monotones, retry/backoff, rapprochement et reprise après bail expiré.

Environnement local attendu : PHP 8.2, SQLite en mémoire, un processus alternant deux instances. PostgreSQL 17 et MySQL 8.4 exécutent les mêmes tests en CI. Ce test est synthétique et borné ; il ne mesure ni débit, ni p95, ni capacité de production. Une vraie charge multi-processus, avec interruption du processus au milieu d'une transaction, reste une UAT d'infrastructure.
