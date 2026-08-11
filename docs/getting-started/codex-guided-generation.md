# Génération guidée avec Codex

FangaBase expose automatiquement un protocole JSON officiel pour les agents et les environnements sans terminal interactif. L’étudiant lance toujours `pnpm create:project` : aucun indicateur technique supplémentaire n’est requis. Ce mode est déterministe, ne dépend pas d’un PTY et n’écrit aucun fichier de projet.

## Procédure obligatoire

Lorsqu’un utilisateur demande à Codex de créer un projet FangaBase :

1. Exécuter simplement `pnpm create:project`.
2. Si `stdin` n’est pas un TTY et qu’aucun brief explicite n’est fourni, lire la réponse JSON automatique `NEEDS_PROJECT_VALIDATION` et suivre intégralement `Fanga_validation_projet.md`.
3. Ne pas terminer le tour : lire le chemin absolu `workflow_file`, expliquer que seul le générateur est installé, puis poser immédiatement les cinq questions de `first_question_block`.
4. Reprendre `.fangabase/session.json` après tout message court de continuation; ne jamais traiter « OK » comme une validation finale.
5. Après une décision `GO_CONDITIONNEL`, produire les documents obligatoires et un `FANGABASE_INPUT.md` contenant exactement un bloc `yaml fangabase` valide.
6. Relancer en interne avec le brief; lire la prochaine question technique et son identifiant stable.
7. Dire « Je vais te poser les questions FangaBase une par une. » puis afficher uniquement la question actuelle et ses choix.
8. Ne jamais choisir une réponse à la place de l’utilisateur, même lorsqu’une valeur par défaut existe.
9. Respecter les conditions d’affichage et ne pas poser une question inapplicable.
10. Enregistrer les réponses dans un objet JSON indexé par les identifiants retournés et relancer `pnpm create:project --agent --json --answers <fichier.json>` jusqu’au statut `READY` ; ces options sont internes au parcours agent et ne sont pas demandées à l’étudiant.
11. Construire depuis `config_yaml` un fichier YAML temporaire validé par le schéma FangaBase, puis demander séparément le dossier de destination.
12. Exécuter d’abord `pnpm create:project --config <fichier-temporaire.yaml> --destination <chemin> --dry-run --json`.
13. Présenter le nom, la destination, l’architecture, le backend, le frontend, la base, l’e-mail, le paiement, la facturation, le design, les fonctionnalités et les composants inclus et exclus.
14. Attendre une confirmation explicite `OUI`.
15. Exécuter seulement après confirmation `pnpm create:project --config <fichier-temporaire.yaml> --destination <chemin> --yes --json`.
16. Supprimer ensuite le fichier temporaire, à condition qu’il ne contienne aucun secret.
17. Ne jamais créer le projet à l’intérieur du dépôt FangaBase.
18. Après génération, poursuivre avec setup, doctor, migrations et smoke selon les commandes du projet ; ne jamais utiliser `--force` sans demande explicite.

## États du protocole

- `NEEDS_PROJECT_VALIDATION` bloque les questions techniques tant que le projet n’a pas reçu un GO conditionnel et ses documents.
- `NEEDS_TECHNICAL_ANSWERS` retourne uniquement la prochaine question visible qui n’a pas encore de réponse.
- `INVALID_ANSWERS` retourne des erreurs rattachées précisément à leurs identifiants.
- `READY_FOR_DRY_RUN` retourne le YAML résolu et un résumé des choix, fonctionnalités et composants.

Sans TTY, `pnpm create:project` produit exactement la même réponse que `pnpm create:project --agent --json`. Le mode automatique ne s’active pas avec `--config`, `--brief`, `--answers` ou une génération explicitement demandée. `--agent` reste disponible pour les tests et la CI et exige `--json`. Le questionnaire PowerShell interactif, `--brief`, `--product-docs`, `--config`, `--destination`, `--dry-run`, `--yes` et la génération atomique restent disponibles sans changement de parcours.
