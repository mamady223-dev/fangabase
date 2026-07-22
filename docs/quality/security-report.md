# Rapport sécurité et SAST

Frontières : navigateur non fiable, API Laravel autoritaire, fournisseurs externes, base et stockage privés. Données sensibles : cookies de session, tokens OAuth, secrets fournisseurs, PII, comptes payout et preuves financières.

Contrôles locaux : TypeScript strict, lint, tests CSRF/CORS/cookies/IDOR/replay/webhook/traversal, recherche de secrets et audits npm/Composer. CI ajoute CodeQL JavaScript/TypeScript et Gitleaks avec permissions minimales. PHP reste couvert par lint, PHPUnit et Composer audit ; un analyseur PHP plus profond pourra être ajouté si sa configuration apporte un signal utile sans affaiblir les tests.

Avis connus au 22 juillet 2026 : deux avis npm modérés, aucun haut/critique ; `firebase/php-jwt` CVE-2025-45769 faible, transitif via le client Google, impact limité car FangaBase n'utilise pas son chiffrement vulnérable. Mise à niveau majeure 7.x impossible sans compatibilité amont vérifiée : action requise, surveiller et retester. Aucun avis n'est silencieusement accepté.

CodeQL et Gitleaks sont configurés mais leur résultat distant doit être observé sur GitHub. Les actions utilisent des versions majeures maintenues et des permissions explicites ; le pin SHA complet reste un durcissement de supply chain du jalon 12.
