# Exploitation

Surveiller health, readiness, profondeur et âge des queues, Outbox `DEAD`, échecs webhooks, paiements non terminaux et retraits en traitement. Rejouer un job `DEAD` uniquement par une action auditée après correction de sa cause. Le rapprochement signale les écarts et n'applique jamais silencieusement une correction irréversible.

Avant release : sauvegarder la base et les fichiers privés, tester la restauration dans une cible temporaire explicite, appliquer les migrations, lancer le smoke test, puis conserver le chemin de rollback. Ne jamais restaurer vers un dossier utilisateur ou une base non explicitement sélectionnée.

Docker est absent du poste local et reste facultatif. Le workflow `ci-docker` construit et teste l'image Next compatible. Les profils VPS Laravel utilisent les services web, worker et scheduler documentés; le profil mutualisé n'exige jamais Docker.

En incident fournisseur, désactiver l'adaptateur concerné, préserver les preuves financières, suspendre les traitements automatiques risqués et lancer le rapprochement avant reprise. Ne jamais journaliser secrets, PII ou erreurs brutes du fournisseur.
