# Rapport de performance local

Environnement : Windows, PHP 8.2, Node 22, SQLite en mémoire, un seul processus, données de tests. Le budget automatisé porte sur 25 appels health et 25 readiness : moins de 2,5 s au total. Il détecte une régression grossière, pas une capacité de production.

Seuils à mesurer en UAT avec jeu réaliste : p95 health 100 ms, auth 500 ms, organisation/catalogue/ledger 300 ms, mutation idempotente 750 ms, lot Outbox ou rapprochement borné à sa taille configurée. Vérifier requêtes N+1, index, pagination maximale 100, mémoire, bundle Next, absence de boucle réseau et backoff avec jitter.

Le résultat local exécuté est consigné dans `docs/release-report.md`. Les seuils métier nécessitent PostgreSQL/MySQL, plusieurs workers, volumes représentatifs et un générateur de charge externe. Aucune promesse de débit de production n'est tirée de SQLite.
