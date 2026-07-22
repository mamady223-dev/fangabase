# Rapport de clone propre RC

Date : 2026-07-22

Révision technique vérifiée : `bba3196`

## Résultats

- Clone Git neuf dans un dossier temporaire explicite : PASS.
- Absence initiale de `.env`, `node_modules` et `vendor` : PASS.
- `pnpm install --frozen-lockfile --ignore-scripts` : PASS.
- `pnpm release:check` : PASS, dont format, lint, typecheck, 80 tests JS/TS et quatre builds.
- `pnpm test:e2e` : PASS, 2 scénarios Playwright en 11,6 s.
- Génération réelle Cloud, VPS, mutualisé et hybride vers des dossiers imbriqués : PASS.
- `pnpm release:package` puis `pnpm release:verify` : PASS.
- Deux productions successives de l'archive au même commit : SHA-256 identique.

## Limite Composer locale

Deux installations Composer depuis des caches temporaires neufs n'ont pas terminé : Packagist a renvoyé des archives de distribution nulles/corrompues et des délais réseau. Aucun répertoire `vendor` existant n'a été copié pour contourner le contrôle. Cette vérification locale est classée UAT EXTERNE. Les runners GitHub neufs compensent la preuve d'installation : `ci-laravel` et `ci-databases` passent sur le même commit avec SQLite, PostgreSQL 17 et MySQL 8.4.

Les dossiers temporaires utilisés sont sous `tmp/` dans le dépôt. Aucun dossier utilisateur, secret ou état externe n'a été supprimé ou restauré.
