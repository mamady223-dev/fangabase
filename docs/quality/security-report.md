# Rapport securite et SAST

Frontieres : navigateur non fiable, API Laravel autoritaire, fournisseurs externes, base et stockage prives. Donnees sensibles : cookies de session, tokens OAuth, secrets fournisseurs, PII, comptes payout et preuves financieres.

Controles locaux : TypeScript strict, lint, tests CSRF/CORS/cookies/IDOR/replay/webhook/traversal, recherche de secrets et audits npm/Composer. PHP est couvert par lint, PHPUnit et Composer audit.

Controles CI observes : CodeQL JavaScript/TypeScript et Gitleaks sont verts avec permissions minimales. `ci-security` est vert avec audit npm bloquant au niveau high et Composer Audit sur le lock, bloquant au-dessus du niveau low.

Avis connus au 26 juillet 2026 : un avis npm modéré, aucun haut/critique ; `firebase/php-jwt` CVE-2025-45769 faible, transitif via le client Google. FangaBase n'utilise pas le chiffrement concerné. La mise à niveau majeure 7.x attend une compatibilité amont vérifiée : surveiller et retester. L'avis faible reste affiché par Composer et documenté, jamais masqué.

L'audit final a corrigé les avis hauts apparus sur Next.js 16.2.10, PostCSS et `brace-expansion`. Le dépôt utilise Next.js 16.2.11, PostCSS 8.5.18 et remplace la résolution vulnérable de Minimatch 3.1.5 par 10.2.5. Le lint, les tests et le build valident cette résolution.

Preuves GitHub : `ci-sast` et `ci-security` verts sur le commit `9ab8f69`, puis de nouveau dans les executions du correctif SQL. Le pin SHA complet des actions reste un durcissement supply chain du jalon 12.
