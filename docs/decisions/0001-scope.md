# ADR 0001 - Périmètre initial de FangaBase

- Statut : accepté
- Date : 2026-07-18

## Contexte

Le dépôt était vide au début de l'implémentation. FangaBase doit être une base applicative originale, pédagogique et exploitable pour quatre cibles : Cloud Vercel, VPS, hébergement mutualisé et architecture hybride.

## Décision

Nous construisons depuis zéro un monorepo pnpm comprenant :

- une application Next.js dans `apps/web` ;
- une application Laravel dans `apps/server` ;
- des contrats OpenAPI et JSON Schema communs sans partage direct de code métier entre TypeScript et PHP ;
- un CLI de génération idempotent dans `tools/cli` ;
- des paquets UI, configuration, SDK et test ;
- des templates de déploiement pour les quatre familles ;
- sept skills Codex propres au dépôt ;
- une documentation en français, avec infrastructure i18n prête pour l'anglais.

Les valeurs par défaut sont : français, XOF, `Africa/Bamako`, Mali, Next.js App Router côté cloud, Laravel côté serveur, PostgreSQL dans le cloud, MySQL en mutualisé, facturation crédits plus abonnement, e-mail journal local et stockage privé local en développement.

## Invariants

- L'argent est un entier en unité mineure et n'utilise jamais de flottant.
- Les écritures financières sont immuables ; toute correction est compensatrice.
- L'idempotence est scopée par propriétaire, opération et fournisseur.
- Les webhooks sont vérifiés sur leur corps brut avant traitement.
- Les secrets, PII et erreurs brutes de fournisseurs ne sont jamais exposés.
- Tout flux obligatoire doit etre completement implemente et verifie.
- La parité TypeScript/Laravel est vérifiée par contrats et cas partagés.

## Contraintes d'environnement constatées

Node.js 22.17.0, pnpm 11.9.0, PHP 8.2.12, Composer 2.8.9 et Git 2.49.0 sont disponibles. Docker n'est pas installé ; les tests nécessitant des services conteneurisés devront utiliser une autre base éphémère ou être exécutés ultérieurement dans un environnement équipé.

## Licence

Une licence commerciale propriétaire a été choisie. Son projet original est dans `LICENSE-COMMERCIAL-DRAFT.md`, mais il ne devient effectif qu’après ajout de l’identité juridique exacte du titulaire et adoption explicite. `LICENSE-DECISION-REQUIRED.md` conserve cette gate.
