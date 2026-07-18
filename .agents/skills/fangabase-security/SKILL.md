---
name: fangabase-security
description: Auditer ou durcir la s?curit? FangaBase pour auth, OAuth, sessions, CSRF, CORS, organisations, uploads, webhooks, secrets et PII. Utiliser avant une release, apr?s une correction sensible ou lorsqu?une vuln?rabilit? est suspect?e.
---

# Auditer la s?curit?

1. D?finir la fronti?re de confiance et les donn?es sensibles.
2. Lire `references/regression-checklist.md` et s?lectionner tous les cas applicables.
3. V?rifier validation, authentification, autorisation objet, suspension et r?vocation.
4. V?rifier cookies, CSRF double-submit obligatoire, CORS exact, CSP et redirections.
5. V?rifier webhooks bruts, idempotence scop?e, concurrence et transitions monotones.
6. V?rifier fichiers priv?s, signature/MIME, traversal et SSRF.
7. Rechercher secrets/PII dans code, configuration, logs et erreurs.
8. Ajouter un test de r?gression avant toute correction.
9. Ex?cuter audits d?pendances et SAST; ne pas accepter silencieusement une vuln?rabilit? haute ou critique.
10. Rendre un rapport avec preuve, gravit?, correctif et commandes ex?cut?es.
