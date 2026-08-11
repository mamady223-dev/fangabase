# Rapport de régression — parcours étudiant continu

Date : 2026-08-11

## Incident reproduit

Après les quatre commandes étudiantes, l’ancien contrat retournait seulement une instruction à interpréter. Il ne transportait ni questions directement exploitables, ni état persistant, ni interdiction machine d’annoncer que le projet étudiant était prêt. Un agent pouvait donc confondre le dépôt du générateur avec le projet généré.

## Scénario corrigé

1. `pnpm create:project` sans TTY retourne `NEEDS_PROJECT_VALIDATION`.
2. Le chemin absolu `workflow_file` existe.
3. Les cinq questions du bloc A sont présentes dans `first_question_block`.
4. Les indicateurs valent `project_generated: false`, `student_project_ready: false`, `must_continue_in_same_turn: true` et `completion_claim_allowed: false`.
5. Une session sans secret est créée dans `.fangabase/session.json`, ignorée par Git.
6. Une reprise avec `OK` retourne `PROJECT_VALIDATION_IN_PROGRESS`, le même bloc et aucune permission d’achèvement.
7. Les réponses du bloc A sont persistées; la reprise suivante retourne uniquement le bloc B.
8. `NO_GO_TEMPORAIRE`, `PIVOT` et tout état antérieur au GO/dry-run empêchent la génération guidée.
9. Une affirmation « projet prêt » reste impossible sans destination, manifeste, configuration, setup, doctor PASS, migrations, tests, build, smoke applicable et rapport final existant.

## Preuves automatisées

- `student-journey.test.ts` couvre création, `OK`, reprise, conservation, bloc suivant, NO-GO et gate de vérité.
- `process.test.ts` exécute le vrai processus CLI sans TTY, vérifie le chemin du workflow, la session et le refus d’une génération prématurée.
- La matrice historique du générateur continue de couvrir les dix profils.

## Test propre

Le résultat du clone propre, du projet réellement généré et des gates post-génération sera ajouté avant publication du commit. Aucun nouveau tag n’est autorisé par ce correctif sans confirmation explicite de l’utilisateur.
