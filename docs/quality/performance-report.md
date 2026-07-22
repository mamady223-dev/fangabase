# Rapport de performance local

Environnement : Windows, PHP 8.2, Node 22, SQLite en mémoire et données de tests.

- Diagnostic : 25 appels health et 25 readiness terminés en 0,501 s, sous le budget automatisé de 2,5 s.
- Worker borné : 100 messages en attente et un bail expiré sont traités par deux instances alternées; 101 messages finissent `SENT`, avec exactement 101 tentatives et aucun rejeu. Test : 1, assertions : 5.

Ces tests détectent les régressions grossières et les erreurs de concurrence simulables, mais ne constituent pas une promesse de débit de production. Les seuils métier doivent être mesurés en UAT avec plusieurs processus réels, PostgreSQL/MySQL, volumes représentatifs et un générateur de charge externe : p95 health 100 ms, auth 500 ms, organisation/catalogue/ledger 300 ms, mutation idempotente 750 ms, lot Outbox ou rapprochement borné à sa taille configurée.

Vérifier également les requêtes N+1, index, pagination maximale 100, mémoire, bundle Next, absence de boucle réseau et backoff avec jitter.
