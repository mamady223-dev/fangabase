---
name: fangabase-architecture
description: Choisir, comparer ou faire ?voluer une architecture FangaBase Cloud Vercel, VPS Next.js, VPS Laravel, mutualis?e Laravel ou hybride. Utiliser pour une d?cision d?h?bergement, de frontend/backend, de base, de queue ou de migration entre profils.
---

# Choisir une architecture

1. Lire `fangabase.config.yaml` et `docs/decisions`.
2. Identifier contraintes de budget, processus permanents, base disponible, ?quipe et domaine.
3. Comparer les profils avec `references/decision-matrix.md`.
4. V?rifier la compatibilit? frontend, backend, base, cache, queue, e-mail, stockage et paiements.
5. Documenter le choix dans un ADR avec risques, sauvegarde, rollback et co?t op?rationnel.
6. Modifier le manifeste puis lancer le CLI en dry-run.
7. Ex?cuter contrats, parit?, tests et build du profil.

Ne d?placer aucune autorit? financi?re vers un frontend serverless dans le profil hybride.
