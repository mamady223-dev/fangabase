# Matrice des bases

| Base          | Local        | CI       | Preuve                                             | Limite                                          |
| ------------- | ------------ | -------- | -------------------------------------------------- | ----------------------------------------------- |
| SQLite        | executee     | executee | 94 tests, 620 assertions, migrations et invariants | ne prouve pas seule les verrous multi-processus |
| PostgreSQL 17 | indisponible | succes   | `migrate:fresh` puis 94 tests dans `ci-databases`  | charge multi-worker reste UAT                   |
| MySQL 8.4     | indisponible | succes   | `migrate:fresh` puis 94 tests dans `ci-databases`  | charge multi-worker reste UAT                   |

Preuve CI : workflow `ci-databases` run `29946653278`, termine avec succes le 22 juillet 2026. Les deux jobs utilisent uniquement les identifiants ephemeres `ci-only`, sans secret de production.

La matrice a revele et fait corriger les noms d index MySQL superieurs a 64 caracteres, la taille de la charge chiffree des comptes payout et la stabilite des reponses idempotentes face au reordonnancement JSON MySQL.
