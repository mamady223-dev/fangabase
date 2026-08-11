# FangaBase

Construire et maintenir une base applicative originale pour les profils Cloud, VPS, mutualisé et hybride.

## Règles

- Écrire du code, des textes et des exemples propres à FangaBase ; ne jamais copier un kit tiers.
- Utiliser `pnpm setup`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` et `pnpm release:check` pour vérifier le dépôt.
- Stocker l'argent en entiers dans l'unité mineure ; aucun flottant dans un calcul financier.
- Vérifier tout webhook sur le corps brut, avec taille, signature et fenêtre temporelle contrôlées.
- Scoper l'idempotence par propriétaire, opération et fournisseur.
- Ajouter un test de régression à chaque correction.
- Ne jamais journaliser ou exposer secrets, PII ou erreurs brutes de fournisseur.
- Les migrations sont additives, réversibles quand possible, testées sur la base concernée et ne suppriment jamais une preuve financière par cascade.
- Aucun TODO ou placeholder dans un flux obligatoire.
- TypeScript et Laravel partagent contrats et cas de test, jamais leur code métier.
- FangaBase est headless par défaut.
- Aucun thème ou design visuel officiel ne doit être créé.
- Les jalons backend ne doivent pas ajouter de pages graphiques.
- Les interfaces de démonstration restent dans `examples`.
- Un design n’est implémenté que sur demande explicite ou depuis une maquette fournie.
- Chaque projet généré doit pouvoir avoir une identité visuelle totalement différente.
- La commande étudiante reste `pnpm create:project` : sans TTY et sans configuration explicite, elle retourne automatiquement le protocole JSON agent.
- Lorsqu’un agent reçoit `NEEDS_PROJECT_VALIDATION`, il ne termine pas son tour : il lit intégralement le chemin absolu `workflow_file` et pose immédiatement les cinq questions de `first_question_block`.
- Le dépôt cloné `FangaBase` est le générateur, jamais le projet étudiant. `generator_ready: true` ne signifie jamais `student_project_ready: true`.
- L’agent reprend `.fangabase/session.json` après « OK », « continue », « reprendre » ou « vas-y »; ces mots ne constituent jamais une preuve d’achèvement.
- Lorsqu’un agent reçoit `NEEDS_TECHNICAL_ANSWERS`, il lit les questions, pose uniquement la première, attend la réponse, la conserve, puis pose la suivante en respectant les conditions.
- Un agent ne choisit jamais une valeur, même lorsqu’une valeur par défaut est documentée, et ne demande la destination qu’après le statut `READY_FOR_DRY_RUN`.
- Après `READY_FOR_DRY_RUN`, l’agent construit et valide le fichier de réponses, demande séparément une destination hors du dépôt FangaBase, exécute un dry-run et présente le résumé.
- L’agent demande `OUI` ou `NON`, génère uniquement après `OUI`, puis poursuit avec setup, doctor, migrations et smoke selon le profil généré.
- `--force` n’est jamais utilisé sans demande explicite de l’utilisateur.
- Toute affirmation « projet prêt » exige `completion_claim_allowed: true`, la destination générée, son manifeste/configuration et les preuves persistées de setup, doctor, migrations, tests, build, smoke applicable et rapport final.
- La validation marché conseille et protège sans emprisonner : une étape sautée ou une validation terrain reportée reste dans FangaBase et conserve honnêtement inconnues, risques et preuves manquantes.
- Après `NO_GO_TEMPORAIRE` ou `PIVOT`, un `USER_OVERRIDE_UNVALIDATED` explicite conserve le score et la décision analytique, puis poursuit le questionnaire technique sans choisir à la place de l’étudiant.
- Quitter FangaBase exige `QUITTER FANGABASE`, puis la confirmation exacte `QUITTER`; cette sortie arrête le parcours et ne lance jamais un starter ou générateur extérieur.
