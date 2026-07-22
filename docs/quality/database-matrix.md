# Matrice des bases

| Base          | Local        | CI                      | Preuve visée                                                                             | Limite                                |
| ------------- | ------------ | ----------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------- |
| SQLite        | exécutée     | exécutée                | migrations vides, invariants et E2E API                                                  | ne prouve pas les verrous concurrents |
| PostgreSQL 17 | indisponible | workflow `ci-databases` | migrations, contraintes, transactions, idempotence, dernier SUPERADMIN, ledgers/retraits | résultat CI requis avant release      |
| MySQL 8.4     | indisponible | workflow `ci-databases` | mêmes suites avec PDO MySQL                                                              | résultat CI requis avant release      |

Le workflow utilise uniquement des mots de passe éphémères `ci-only`. Ce ne sont pas des secrets de production. Tant que le workflow n'a pas été observé vert sur GitHub, PostgreSQL/MySQL restent « configurés et validés statiquement », jamais « testés avec succès ».
