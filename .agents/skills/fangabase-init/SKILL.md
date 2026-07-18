---
name: fangabase-init
description: Auditer les pr?requis, lire ou cr?er fangabase.config.yaml et g?n?rer un profil FangaBase. Utiliser pour initialiser, reconfigurer, diagnostiquer ou g?n?rer un projet FangaBase, en interactif ou depuis un fichier.
---

# Initialiser FangaBase

1. Lire `AGENTS.md`, `docs/progress.md` et la configuration existante.
2. Ex?cuter `pnpm doctor`; ne jamais afficher la valeur d?un secret.
3. Si aucune configuration n?est fournie, poser uniquement le questionnaire minimal produit, architecture, services, paiement.
4. Valider avec `pnpm fangabase:init --config <fichier> --dry-run --json`.
5. Corriger toute incompatibilit? avant l??criture.
6. G?n?rer sans ?craser silencieusement un fichier utilisateur.
7. Installer avec lockfile strict, puis ex?cuter typecheck, tests, build et smoke test du profil.
8. Mettre ? jour `docs/progress.md` avec chiffres r?els et UAT live en attente.

Lire `references/profiles.md` seulement pour r?soudre un choix d?architecture.
