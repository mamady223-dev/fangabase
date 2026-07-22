# Politique de sécurité

Ne publiez pas une vulnérabilité dans une issue publique. Transmettez un rapport privé au propriétaire du dépôt avec impact, reproduction minimale et version concernée. L'adresse privée de contact doit être communiquée aux étudiants autorisés hors du dépôt ; aucune adresse n'est inventée ici.

Ne joignez jamais de secret réel ni de PII. Révoquez immédiatement tout secret exposé, conservez les preuves sans données sensibles et indiquez la version affectée. Les correctifs critiques incluent un test de régression et une procédure de rotation.

Versions prises en charge : la release candidate `0.1.0-rc.1` reçoit des correctifs pendant son évaluation. Aucun engagement de support pour une release stable n'est annoncé avant sa publication explicite.

Les contrôles automatisés couvrent authentification, sessions, CSRF, CORS, isolation tenant, rôles, webhooks, idempotence, stockage privé, ledgers, dépendances, CodeQL et Gitleaks. Les comptes fournisseurs et environnements live restent hors du dépôt.
