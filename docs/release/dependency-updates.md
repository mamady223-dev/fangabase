# Mise à jour des dépendances et actions

1. Créer une branche dédiée et lire les notes de version officielles.
2. Mettre à jour une famille cohérente à la fois avec pnpm ou Composer ; ne jamais modifier manuellement une résolution pour masquer un audit.
3. Conserver `pnpm-lock.yaml` et `apps/server/composer.lock`. Utiliser `pnpm install --frozen-lockfile` et `composer install --no-interaction --prefer-dist` en CI.
4. Vérifier `pnpm-workspace.yaml#allowBuilds` avant d'autoriser un script natif. Refuser tout script non nécessaire et documenter le besoin.
5. Épingler chaque action GitHub à un SHA complet, avec la version majeure en commentaire. Vérifier le SHA depuis le dépôt officiel avant changement.
6. Exécuter audits, tests, builds, migrations, E2E, packaging et scans de secrets.
7. Régénérer la SBOM et comparer les licences dans `THIRD_PARTY_NOTICES.md`.
8. Pour une mise à jour majeure, documenter migration, rollback et incompatibilités dans `CHANGELOG.md`.

Dependabot peut proposer des mises à jour, mais aucune fusion ne doit contourner les gates ni activer automatiquement un outil externe nécessitant un compte ou une clé.
