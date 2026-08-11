# Journal des changements

## 0.4.0-rc.1 - en préparation

- Ajout des profils VPS et mutualisé `laravel_inertia_react`, constitués d’une seule application Laravel avec React 19, Inertia 2, TypeScript et Vite 7.
- Questionnaire commun étendu sans casser les anciens identifiants : les architectures intégrées et séparées sont désormais explicites.
- Génération racine, environnement unique, contrôles Vite publics, documentation et déploiements PHP-FPM/Apache adaptés.
- Matrice portée à dix profils et CI dédiée à l’installation, aux tests et au build des deux nouveaux profils.

## Stabilisation finale de 0.3.0-rc.1

- Bascule automatiquement `pnpm create:project` vers le protocole agent lorsque stdin n’est pas un TTY et qu’aucune génération explicite n’est demandée.
- Structure `next_action` pour imposer une seule question à la fois et reporter la destination après `READY`.
- Ajoute le protocole non interactif `create:project --agent --json`, son registre de questions partagé et la reprise progressive par fichier de réponses, sans écriture avant confirmation.
- Documente le parcours guidé Codex tout en conservant le questionnaire PowerShell et les sept profils existants.

- Stabilise le harnais de conformité Laravel avec `--no-reload`, un port système libre et des diagnostics de processus complets en cas de rupture réseau.
- Désactive la réutilisation keep-alive dans le client de conformité pour respecter le comportement de fermeture du serveur PHP de développement.

- Ajoute `--brief` pour importer un bloc déterministe `yaml fangabase` validé par le schéma existant.
- Ajoute l’import sûr `--product-docs` sans génération de métier.
- Uniformise les commandes et guides post-génération selon le profil.
- Corrige le clone canonique, les prérequis par profil et ajoute `pnpm docs:check`.
- Épingle `brace-expansion`, `js-yaml` et `nanoid` aux correctifs disponibles; aucune alerte haute ou critique ne reste dans l’audit pnpm.
- Met à jour Guzzle 7.15.3 et League CommonMark 2.9.0 après les avis de sécurité publiés pendant la CI.

## 0.3.0-rc.1 - en préparation

- Transformation du CLI en générateur atomique de projets indépendants avec
  `pnpm create:project`, dry-run JSON, manifeste SHA-256, registre déclaratif,
  doctor ciblé et matrice Cloud, VPS, mutualisée et hybride.

## 0.2.0-rc.2 - 2026-07-26

- Ajout de l'intégration générique Orange Money Mali `orange_money_ml` pour
  Laravel et Next.js, avec simulateur local, secrets chiffrés, callbacks non
  autoritaires et UAT marchand externe obligatoire.
- Migration contrôlée de l'ancien identifiant `orange_money` vers
  `orange_money_ml`.

## 0.2.0-rc.1 - 2026-07-26

- Backend Next.js persistant et autonome : identité, OAuth, organisations,
  fonctions utilisateur, finance, paiements, retraits et Outbox.
- Migrations PostgreSQL, runtime poolé, jobs VPS et CI PostgreSQL Next.js.
- API Laravel génériques complétées pour compte, notifications, profil,
  uploads et exploitation.
- Autorité unique explicite par profil et génération Cloud sans Laravel.
- Template technique React headless réel ; `inertia` n'est plus proposé tant
  qu'il n'est pas implémenté.

## 0.1.0-rc.1 - 2026-07-26

### Fonctionnalités

- Socle headless Next.js/Laravel, CLI idempotent et profils Cloud, VPS, mutualisé et hybride.
- Identité sécurisée, organisations, administration, Outbox SQL, stockage privé, catalogue, crédits, abonnements, entitlements et retraits.
- Contrats partagés par schémas et cas de test, sans partage du code métier TypeScript/PHP.

### Sécurité

- Sessions à rotation et familles révocables, CSRF double-submit, CORS exact, OAuth Google PKCE et protections anti-IDOR.
- Webhooks signés sur corps brut, idempotence scopée, ledgers append-only et erreurs fournisseurs expurgées.
- CodeQL, Gitleaks, audits de dépendances et actions GitHub épinglées par SHA.
- Next.js 16.2.11, PostCSS 8.5.18 et une résolution sûre de Minimatch corrigent les avis hauts détectés avant le tag RC.

### Paiements et fournisseurs

- Adaptateurs locaux, Stripe et FedaPay isolés selon leurs capacités documentées.
- Stripe et FedaPay exigent encore une UAT sandbox ; les fournisseurs sans contrat vérifié restent `NEEDS_PROVIDER_CONTRACT`.

### Déploiement et qualité

- Migrations et 94 tests Laravel validés sur SQLite, PostgreSQL 17 et MySQL 8.4.
- E2E headless, packaging déterministe, manifeste SHA-256, SBOM CycloneDX et provenance CI.

### Limites de la release candidate

- Licence commerciale propriétaire finalisée au nom de Mamady Traoré, auteur et titulaire légal des droits, en qualité de CEO de Motechnova.
- Les Applications étudiantes peuvent être commercialisées ; FangaBase lui-même ne peut être revendu, partagé ou redistribué.
- Les dépendances tierces conservent leurs propres licences et avis.
- Docker local indisponible ; image VPS Next vérifiée en CI. Docker n'est jamais requis en mutualisé.
- Comptes fournisseurs, stockage distant, restauration live et charge réellement concurrente restent des UAT externes.

### Compatibilité

- Node.js 22+, pnpm 11+, PHP 8.2+ et Composer 2.8+.
- Aucun changement destructif de schéma ; les index MySQL et charges chiffrées ont été rendus portables.
