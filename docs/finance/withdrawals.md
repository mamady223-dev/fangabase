# Retraits et rapprochement

Le jalon 7 etend le ledger financier commun; il ne cree aucun moteur parallele. Une demande reserve d'abord le montant par une ecriture `WITHDRAWAL_RESERVE`. Une annulation ou un echec produit `WITHDRAWAL_RESERVE_RELEASE`. Un paiement confirme produit une liberation de reserve puis `WITHDRAWAL_PAID`. Les ecritures existantes ne sont jamais modifiees ou supprimees par le code metier.

## Cycle d'etat

`REQUESTED -> VERIFYING -> APPROVED -> SENT -> PENDING -> PAID`

Les branches terminales autorisees sont `CANCELLED`, `FAILED` et `RECONCILED`. Toute autre transition retourne `WITHDRAWAL_TRANSITION_INVALID`. Le navigateur ou le retour d'une redirection ne confirme jamais un payout.

## Securite

- Les comptes de paiement sortant appartiennent a un utilisateur ou une organisation et leurs coordonnees sont chiffrees. API et audit n'exposent qu'identifiant, pays, devise, fournisseur et empreinte.
- Montants en unite mineure, devises autorisees, minimum, maximum et rate limiting sont valides cote serveur.
- L'idempotence est scopee par proprietaire, operation et fournisseur. Une reservation SQL `__pending` bloque les soumissions concurrentes.
- Toutes les mutations utilisateur et administrateur passent par session et CSRF double-submit. Les recherches proprietaire evitent les IDOR.
- Le worker utilise des baux recuperables, un backoff borne, un identifiant fournisseur idempotent et une limite d'essais.
- Les callbacks exigent corps brut, limite de 1 Mio, signature, horodatage de cinq minutes et unicite fournisseur/evenement/type. Aucun callback n'est active pour un fournisseur tant que son contrat officiel n'est pas implemente.

## Fournisseurs

Tous les adaptateurs de payout reels sont actuellement `NEEDS_PROVIDER_CONTRACT`. Le simulateur injectable ne prouve que le contrat local. Aucun endpoint, header ou algorithme fournisseur n'est annonce en production. PostgreSQL/MySQL concurrents, callbacks officiels et paiements sortants sandbox/live restent des UAT externes.

## Operations

- `php artisan fangabase:payout-worker --once --limit=25` traite un lot.
- `php artisan fangabase:withdrawals:reconcile <provider>` compare retraits, ledger, Outbox et statut fournisseur.
- Le worker est planifie chaque minute. Le rapprochement doit etre planifie par fournisseur seulement apres activation contractuelle.

Un ecart cree une ligne `reconciliation_anomalies`. Sa resolution exige un motif et un audit; une correction financiere doit toujours etre compensatoire.
