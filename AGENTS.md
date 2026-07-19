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
