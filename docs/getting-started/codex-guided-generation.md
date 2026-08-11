# Génération guidée avec Codex

FangaBase expose un protocole JSON officiel pour les agents et les environnements sans terminal interactif. Ce mode est déterministe, ne dépend pas d’un PTY et n’écrit aucun fichier de projet.

## Procédure obligatoire

Lorsqu’un utilisateur demande à Codex de créer un projet FangaBase :

1. Ne pas lancer directement le questionnaire interactif si `stdin` n’est pas un TTY.
2. Exécuter `pnpm create:project --agent --json`.
3. Lire la liste ordonnée des questions et leurs identifiants stables.
4. Dire « Je vais te poser les questions FangaBase une par une. » puis afficher uniquement la question actuelle et ses choix.
5. Ne jamais choisir une réponse à la place de l’utilisateur, même lorsqu’une valeur par défaut existe.
6. Respecter les conditions d’affichage et ne pas poser une question inapplicable.
7. Enregistrer les réponses dans un objet JSON indexé par les identifiants retournés et relancer `pnpm create:project --agent --json --answers <fichier.json>` jusqu’au statut `READY`.
8. Construire depuis `config_yaml` un fichier YAML temporaire validé par le schéma FangaBase, puis demander séparément le dossier de destination.
9. Exécuter d’abord `pnpm create:project --config <fichier-temporaire.yaml> --destination <chemin> --dry-run --json`.
10. Présenter le nom, la destination, l’architecture, le backend, le frontend, la base, l’e-mail, le paiement, la facturation, le design, les fonctionnalités et les composants inclus et exclus.
11. Attendre une confirmation explicite `OUI`.
12. Exécuter seulement après confirmation `pnpm create:project --config <fichier-temporaire.yaml> --destination <chemin> --yes --json`.
13. Supprimer ensuite le fichier temporaire, à condition qu’il ne contienne aucun secret.
14. Ne jamais créer le projet à l’intérieur du dépôt FangaBase.
15. Ne jamais utiliser `--force` sans demande explicite.

## États du protocole

- `NEEDS_ANSWERS` retourne uniquement les questions visibles qui n’ont pas encore de réponse.
- `INVALID_ANSWERS` retourne des erreurs rattachées précisément à leurs identifiants.
- `READY` retourne le YAML résolu et un résumé des choix, fonctionnalités et composants.

`--agent` exige `--json` et refuse les options qui pourraient écrire ou générer un projet. Le questionnaire PowerShell interactif, `--brief`, `--product-docs`, `--config`, `--destination`, `--dry-run`, `--yes` et la génération atomique restent disponibles sans changement de parcours.
