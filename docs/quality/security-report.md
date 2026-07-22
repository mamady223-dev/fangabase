# Rapport securite et SAST

Frontieres : navigateur non fiable, API Laravel autoritaire, fournisseurs externes, base et stockage prives. Donnees sensibles : cookies de session, tokens OAuth, secrets fournisseurs, PII, comptes payout et preuves financieres.

Controles locaux : TypeScript strict, lint, tests CSRF/CORS/cookies/IDOR/replay/webhook/traversal, recherche de secrets et audits npm/Composer. PHP est couvert par lint, PHPUnit et Composer audit.

Controles CI observes : CodeQL JavaScript/TypeScript et Gitleaks sont verts avec permissions minimales. `ci-security` est vert avec audit npm bloquant au niveau high et Composer Audit sur le lock, bloquant au-dessus du niveau low.

Avis connus au 22 juillet 2026 : deux avis npm moderes, aucun haut/critique ; `firebase/php-jwt` CVE-2025-45769 faible, transitif via le client Google. FangaBase n utilise pas le chiffrement concerne. La mise a niveau majeure 7.x attend une compatibilite amont verifiee : surveiller et retester. L avis faible reste affiche par Composer et documente, jamais masque.

Preuves GitHub : `ci-sast` et `ci-security` verts sur le commit `9ab8f69`, puis de nouveau dans les executions du correctif SQL. Le pin SHA complet des actions reste un durcissement supply chain du jalon 12.
