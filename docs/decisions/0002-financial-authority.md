# ADR 0002 — Autorité financière côté Laravel

## Décision

Laravel et sa base relationnelle restent l’autorité pour le catalogue, les prix, crédits, abonnements, entitlements et audits. Next.js affiche les réponses et transmet les commandes authentifiées ; il ne calcule ni ne confirme une valeur financière. Les fournisseurs du jalon 6 implémenteront des ports séparés et ne modifieront pas directement les ledgers.

## Raisons

- transactions et verrouillage cohérents sur les profils VPS Laravel, mutualisé et hybride ;
- même modèle append-only pour toutes les preuves financières ;
- aucun montant frontend faisant autorité ;
- fonctionnement local sans Redis ni processus permanent.

## Exploitation

SQLite valide les invariants mono-processus. PostgreSQL/MySQL doivent vérifier les courses de consommation avant production. Les migrations restent additives ; le rollback applicatif remet l’ancienne version sans supprimer les nouvelles tables. Les sauvegardes couvrent simultanément les ledgers, lots, réservations, abonnements, transitions, entitlements et audits.
