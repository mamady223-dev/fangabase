# FangaBase

FangaBase est un monorepo original pour d?marrer un SaaS, une marketplace, une plateforme de services ou un outil m?tier sur Vercel, VPS, h?bergement mutualis? ou architecture hybride.

## D?marrage

Pr?requis : Node 22+, pnpm 11+, PHP 8.2+ et Composer 2.8+.

```sh
pnpm install --frozen-lockfile
composer install --working-dir=apps/server
pnpm fangabase:init --config fangabase.config.example.yaml
pnpm test
pnpm build
```

Docker est facultatif pour le d?veloppement courant. Les UAT de bases conteneuris?es restent ? ex?cuter sur un poste ?quip?.

La configuration canonique est `fangabase.config.yaml`. Les contrats communs sont dans `packages/contracts`; le code m?tier TypeScript et PHP reste s?par?.

Consultez `docs/progress.md` pour l??tat factuel et `docs/getting-started/quickstart.md` pour le parcours p?dagogique.

## Exploitation headless

Le choix Cloud/Vercel, VPS, mutualisé ou hybride génère uniquement les artefacts compatibles dans `deployment/`. Consultez `docs/architecture/profiles.md`, `docs/operations/smoke-tests.md` et `docs/operations/backup-restore.md`. Les valeurs `example.invalid` sont volontairement non fonctionnelles : injectez les domaines et secrets au runtime sans les enregistrer dans Git.

Pour raccorder le frontend choisi par l'étudiant sans adopter de thème commun, consultez `docs/frontend/integration.md` et `docs/frontend/origin-matrix.md`. Stitch, Banani, les maquettes, l'IA explicitement demandée et les frontends personnalisés restent des workflows facultatifs.
