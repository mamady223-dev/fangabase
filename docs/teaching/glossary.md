# Glossaire progressif

## Idempotence

D?finition : r?p?ter la m?me demande produit le m?me effet. Exemple : une cl? de paiement renvoie la commande initiale. Erreur fr?quente : partager la cl? entre deux utilisateurs. Utile dans paiements et retraits.

## Ledger

D?finition : journal immuable d?entr?es de valeur. Exemple : cr?dit 1 000 XOF puis d?bit 200 XOF. Erreur fr?quente : modifier une ligne au lieu d?ajouter une compensation. Utile dans cr?dits et marketplace.

## Webhook

D?finition : notification serveur ? serveur. Exemple : FedaPay confirme un paiement. Erreur fr?quente : faire confiance ? la redirection navigateur. Utile dans paiements.

## Outbox

D?finition : ?v?nement durable ?crit dans la transaction m?tier. Exemple : paiement r?ussi puis notification. Erreur fr?quente : publier avant le commit. Utile dans jobs et e-mails.

## CSRF

D?finition : attaque qui force un navigateur authentifi? ? muter des donn?es. Exemple : formulaire externe. Erreur fr?quente : accepter si le cookie manque. Utile dans auth et hybride.

## Readiness

D?finition : aptitude ? servir avec les d?pendances obligatoires. Exemple : base joignable. Erreur fr?quente : rendre l?application indisponible pour Sentry facultatif. Utile au d?ploiement.
