# Journal des changements

## 0.1.0-rc.1 - 2026-07-22

### Fonctionnalités

- Socle headless Next.js/Laravel, CLI idempotent et profils Cloud, VPS, mutualisé et hybride.
- Identité sécurisée, organisations, administration, Outbox SQL, stockage privé, catalogue, crédits, abonnements, entitlements et retraits.
- Contrats partagés par schémas et cas de test, sans partage du code métier TypeScript/PHP.

### Sécurité

- Sessions à rotation et familles révocables, CSRF double-submit, CORS exact, OAuth Google PKCE et protections anti-IDOR.
- Webhooks signés sur corps brut, idempotence scopée, ledgers append-only et erreurs fournisseurs expurgées.
- CodeQL, Gitleaks, audits de dépendances et actions GitHub épinglées par SHA.

### Paiements et fournisseurs

- Adaptateurs locaux, Stripe, FedaPay et Monero isolés selon leurs capacités documentées.
- Stripe et FedaPay exigent encore une UAT sandbox ; les fournisseurs sans contrat vérifié restent `NEEDS_PROVIDER_CONTRACT`.

### Déploiement et qualité

- Migrations et 94 tests Laravel validés sur SQLite, PostgreSQL 17 et MySQL 8.4.
- E2E headless, packaging déterministe, manifeste SHA-256, SBOM CycloneDX et provenance CI.

### Limites de la release candidate

- Licence commerciale en brouillon tant que l'identité juridique du titulaire n'est pas fournie.
- Docker local indisponible ; image VPS Next vérifiée en CI. Docker n'est jamais requis en mutualisé.
- Comptes fournisseurs, wallet Monero, stockage distant, restauration live et charge réellement concurrente restent des UAT externes.

### Compatibilité

- Node.js 22+, pnpm 11+, PHP 8.2+ et Composer 2.8+.
- Aucun changement destructif de schéma ; les index MySQL et charges chiffrées ont été rendus portables.
