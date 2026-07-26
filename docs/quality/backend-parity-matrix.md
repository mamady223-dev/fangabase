# Matrice de parité Laravel / Next.js

## État après implémentation du jalon 13

| Domaine                             | Contrat commun                      | Laravel                        | Next.js autonome                | Preuve locale                             | Preuve CI requise         |
| ----------------------------------- | ----------------------------------- | ------------------------------ | ------------------------------- | ----------------------------------------- | ------------------------- |
| Identité, compte, sessions          | Routes, rôles, erreurs              | Présent                        | Présent                         | Scénarios HTTP communs                    | PostgreSQL Next           |
| Google OAuth PKCE                   | Route et invariants                 | Présent                        | Présent, fournisseur injectable | Tests Laravel et Next                     | UAT Google externe        |
| Organisations et administration     | Routes, rôles, pagination           | Présent                        | Présent                         | Anti-IDOR, suspension, dernier SUPERADMIN | PostgreSQL Next           |
| Notifications, profil, uploads      | Routes et erreurs                   | Présent après J13              | Présent                         | Tests domaine Next ; migrations Laravel   | Stockages distants en UAT |
| Catalogue, crédits, abonnements     | Argent entier, statuts, idempotence | Présent                        | Présent                         | Tests financiers des deux familles        | Concurrence PostgreSQL    |
| Paiements, webhooks, remboursements | Statuts et routes                   | Présent                        | Présent                         | Signatures, replay et doublons testés     | UAT Stripe/FedaPay        |
| Retraits et rapprochement           | Statuts et routes                   | Présent                        | Présent                         | Approbation, callback signé, doublon      | UAT payout/polling        |
| Outbox, worker, scheduler           | Statuts et événements               | Présent                        | Présent                         | Baux/retry local ; commandes VPS générées | CI PostgreSQL/VPS         |
| Health/readiness                    | Routes                              | Présent                        | Présent                         | Route loading et build Next               | Démarrage production CI   |
| React headless                      | Client/API/CSRF                     | Applicable aux profils Laravel | Générable lorsqu'autorisé       | Tests CLI                                 | Build généré              |

## Preuve comportementale

La preuve de parité ne repose ni sur un nombre de routes, ni sur une comparaison
d'enums ou de fichiers. `@fangabase/conformance` démarre réellement Laravel et
Next.js, leur envoie les mêmes requêtes HTTP et utilise des bases isolées.
Laravel emploie une base SQLite dédiée localement. Next.js emploie un stockage
isolé localement et une base PostgreSQL dédiée dans `ci-next-postgres`.

Les 29 scénarios obligatoires couvrent : inscription, connexion, utilisateur
courant, vérification e-mail, oubli et réinitialisation du mot de passe,
changement de mot de passe, rotation et révocation des sessions, organisations,
invitations, rôles, anti-IDOR, suspension, dernier SUPERADMIN, notifications,
uploads, catalogue, crédits, abonnements, entitlements, paiement local,
idempotence, webhook dupliqué, remboursement, retrait, rapprochement, Outbox,
codes d'erreur, CSRF et CORS.

Résultats locaux :

- 29 scénarios communs verts sur Laravel ;
- 29 scénarios communs verts sur Next.js ;
- Laravel : 96 tests, 638 assertions ;
- PostgreSQL Next.js obligatoire dans `ci-next-postgres`.

Date de l'audit initial : 2026-07-26  
Référence avant jalon 13 : `v0.1.0-rc.1`

La présence d'un type, d'un exemple YAML ou d'un proxy n'est jamais comptée comme une implémentation. `Présent` signifie qu'une route et une logique métier persistante existent avec des tests applicables. `Partiel` signifie qu'une partie du domaine existe sans toute l'API générique attendue.

| Fonction                               | Contrat commun avant J13 | Laravel avant J13            | Tests Laravel | Next.js avant J13          | Tests Next.js   | Parité avant J13 | Cloud autonome | VPS Next autonome | Statut initial |
| -------------------------------------- | ------------------------ | ---------------------------- | ------------- | -------------------------- | --------------- | ---------------- | -------------- | ----------------- | -------------- |
| Inscription et connexion               | Partiel                  | Présent                      | Oui           | Absent                     | Non             | Non              | Non            | Non               | Écart          |
| Utilisateur courant                    | Absent                   | Absent                       | Non           | Absent                     | Non             | Non              | Non            | Non               | Absent         |
| Vérification e-mail                    | Absent                   | Présent                      | Oui           | Absent                     | Non             | Non              | Non            | Non               | Écart          |
| Mot de passe oublié/reset              | Absent                   | Présent                      | Oui           | Absent                     | Non             | Non              | Non            | Non               | Écart          |
| Changement de mot de passe             | Absent                   | Absent                       | Non           | Absent                     | Non             | Non              | Non            | Non               | Absent         |
| Sessions/rotation/révocation           | Partiel                  | Présent                      | Oui           | Absent                     | Non             | Non              | Non            | Non               | Écart          |
| Google OAuth PKCE                      | Absent                   | Présent                      | Oui           | Absent                     | Non             | Non              | Non            | Non               | Écart          |
| Organisations/membres                  | Partiel                  | Présent                      | Oui           | Modèle mémoire seulement   | Unitaire core   | Non              | Non            | Non               | Écart          |
| Invitations one-shot                   | Absent                   | Présent                      | Oui           | Absent                     | Non             | Non              | Non            | Non               | Écart          |
| Rôles, permissions, anti-IDOR          | Partiel                  | Présent                      | Oui           | Modèle mémoire seulement   | Unitaire core   | Non              | Non            | Non               | Écart          |
| Administration globale                 | Partiel                  | Présent                      | Oui           | Absent                     | Non             | Non              | Non            | Non               | Écart          |
| Dernier SUPERADMIN                     | Partiel                  | Présent                      | Oui           | Modèle mémoire seulement   | Unitaire core   | Non              | Non            | Non               | Écart          |
| Notifications/préférences              | Absent                   | Absent                       | Non           | Absent                     | Non             | Non              | Non            | Non               | Absent         |
| Profil utilisateur                     | Absent                   | Absent                       | Non           | Absent                     | Non             | Non              | Non            | Non               | Absent         |
| Upload privé                           | Absent                   | Port présent, API absente    | Unitaire      | Stockage mémoire seulement | Unitaire core   | Non              | Non            | Non               | Partiel        |
| Catalogue/prix versionnés              | Partiel                  | Présent                      | Oui           | Proxy d'administration     | Proxy seulement | Non              | Non            | Non               | Écart          |
| Crédits/lots FEFO                      | Partiel                  | Présent                      | Oui           | Modèle ledger mémoire      | Unitaire core   | Non              | Non            | Non               | Écart          |
| Réservation/confirmation/remboursement | Partiel                  | Présent                      | Oui           | Modèle mémoire partiel     | Unitaire core   | Non              | Non            | Non               | Écart          |
| Abonnements                            | Partiel                  | Présent                      | Oui           | Absent                     | Non             | Non              | Non            | Non               | Écart          |
| Entitlements                           | Partiel                  | Présent                      | Oui           | Absent                     | Non             | Non              | Non            | Non               | Écart          |
| Checkout/prix serveur                  | Partiel                  | Présent                      | Oui           | Simulateur mémoire         | Unitaire core   | Non              | Non            | Non               | Écart          |
| Webhooks/replay                        | Partiel                  | Présent                      | Oui           | Processeur mémoire         | Unitaire core   | Non              | Non            | Non               | Écart          |
| Remboursements                         | Partiel                  | Présent                      | Oui           | Absent persistant          | Non             | Non              | Non            | Non               | Écart          |
| Outbox transactionnelle                | Schéma événement         | Présent                      | Oui           | Queue mémoire              | Unitaire core   | Non              | Non            | Non               | Écart          |
| Retraits/ledger payout                 | Partiel                  | Présent                      | Oui           | Service mémoire partiel    | Unitaire core   | Non              | Non            | Non               | Écart          |
| Callbacks/polling/rapprochement        | Partiel                  | Présent                      | Oui           | Absent persistant          | Non             | Non              | Non            | Non               | Écart          |
| Rate limiting persistant               | Absent                   | Présent                      | Oui           | Absent                     | Non             | Non              | Non            | Non               | Écart          |
| Audit persistant                       | Partiel                  | Présent                      | Oui           | Journal mémoire            | Unitaire core   | Non              | Non            | Non               | Écart          |
| Health/readiness                       | Partiel                  | Présent                      | Oui           | Présent sans connexion DB  | Oui health      | Partiel          | Partiel        | Partiel           | Partiel        |
| Pagination/erreurs stables             | Partiel                  | Présent sur certaines listes | Oui           | Absent                     | Non             | Non              | Non            | Non               | Écart          |
| CSRF/CORS/cookies                      | Partiel                  | Présent                      | Oui           | Proxys seulement           | Partiel         | Non              | Non            | Non               | Écart          |
| Migrations PostgreSQL Next.js          | Absent                   | Sans objet                   | Sans objet    | Absent                     | Non             | Non              | Non            | Non               | Absent         |
| Cron/worker Next.js                    | Absent                   | Sans objet                   | Sans objet    | Absent                     | Non             | Non              | Non            | Non               | Absent         |
| Template React générable               | Absent                   | Sans objet                   | Non           | Absent                     | Non             | Non              | Non            | Non               | Absent         |

## Inventaire initial des routes

- Laravel : 54 routes HTTP déclarées dans `apps/server/routes/api.php`.
- Next.js : 5 handlers HTTP actifs sous `apps/web/src/app/api`.
- Parmi les 5 handlers Next.js, 3 délèguent obligatoirement à Laravel via `FANGABASE_API_ORIGIN`.
- L'OpenAPI initial ne décrit qu'une partie des routes Laravel et ne constitue pas une preuve de backend Next.js.

Cette matrice sera actualisée avec les routes, suites de conformité et preuves PostgreSQL réelles du jalon 13.
