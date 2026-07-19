# Facturation, crédits et entitlements

## Catalogue

Produits, plans et prix sont versionnés et archivables. Les montants sont des entiers en unité mineure et les devises sont des codes ISO à trois lettres. Toute création d’achat relit le prix actif côté serveur. Un prix archivé reste présent pour les commandes et preuves historiques.

## Crédits

`credit_ledger_entries` est la source append-only. Les lots servent uniquement à allouer en priorité ceux qui expirent le plus tôt et à suivre les réservations. Une expiration ajoute une écriture compensatrice. Réserver ajoute un débit ; confirmer consomme la réservation ; libérer ajoute l’écriture inverse. Les attributions et ajustements administratifs exigent `SUPERADMIN`, un motif et un audit.

L’idempotence est scopée par propriétaire, opération, fournisseur et clé. Réutiliser la clé avec un corps différent renvoie `IDEMPOTENCY_BODY_MISMATCH`. La consommation n’a aucune route utilisateur : un service métier autorisé appelle `CreditService::reserve`, puis confirme ou libère.

## Abonnements

Le modèle est neutre : `PENDING`, `TRIALING`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCEL_AT_PERIOD_END`, `CANCELLED`, `EXPIRED`. Le frontend peut créer un abonnement en attente ou demander son annulation, jamais l’activer. Seul `applyVerifiedEvent` accepte une confirmation interne vérifiée, monotone et séquencée. Chaque transition est conservée.

## Entitlements

Les plans fournissent fonctionnalités et quotas ; les crédits couvrent l’usage additionnel ; des achats uniques ou attributions administratives peuvent créer des droits permanents ou temporaires. Le résolveur retourne la source, la limite, la consommation et l’échéance. Une suspension utilisateur ou organisation supprime immédiatement tous les droits effectifs.

## API et interface

- public : `GET /api/catalog` ;
- authentifié : résumé, crédits, historique, abonnement et entitlements ;
- CSRF strict : achat de crédits, création en attente, annulation ;
- administration : catalogue, archivage, attributions et événements paginés.

Les démonstrations Next.js de tarification et facturation sont conservées dans `examples/frontend-pages`. Elles illustrent les états chargement, vide, erreur et succès sans constituer une interface officielle. Les proxies fonctionnels restent disponibles. `FANGABASE_API_ORIGIN` configure leur backend fixe ; aucune URL fournie par un utilisateur n’est appelée.

## Limites UAT

Les adaptateurs locaux prouvent les contrats, pas un paiement. Les checkouts, webhooks officiels et remboursements monétaires arrivent au jalon 6. La consommation simultanée multi-worker doit être testée sur PostgreSQL/MySQL dès que Docker ou une base UAT est disponible.
