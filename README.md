# FangaBase

FangaBase est un monorepo original pour d?marrer un SaaS, une marketplace, une plateforme de services ou un outil m?tier sur Vercel, VPS, h?bergement mutualis? ou architecture hybride.

## Démarrage

Prérequis : Node 22+, pnpm 11+, PHP 8.2+ et Composer 2.8+.

```sh
pnpm setup
pnpm doctor
pnpm fangabase:init --config fangabase.config.example.yaml --dry-run
pnpm fangabase:init --config fangabase.config.example.yaml
php apps/server/artisan migrate --force
pnpm test
pnpm build
```

Docker est facultatif pour le développement courant et n'est jamais requis pour le profil mutualisé. Copiez `apps/server/.env.example` vers `apps/server/.env` uniquement pour un démarrage local, générez une clé locale avec `php apps/server/artisan key:generate`, et ne commitez jamais ce fichier.

La configuration canonique est `fangabase.config.yaml`. Les contrats communs sont dans `packages/contracts`; le code m?tier TypeScript et PHP reste s?par?.

Consultez `docs/progress.md` pour l'état factuel et `docs/getting-started/quickstart.md` pour le parcours pédagogique complet.

## Release candidate et licence

La version préparée est `0.1.0-rc.1`. Le texte commercial reste un brouillon dans `LICENSE-COMMERCIAL-DRAFT.md` tant que l'identité juridique exacte du titulaire n'est pas fournie. Aucun droit nouveau n'est accordé par ce brouillon ; `LICENSE-DECISION-REQUIRED.md` reste applicable. Le texte doit idéalement être vérifié par un professionnel du droit avant commercialisation à grande échelle.

Créer et vérifier l'archive autorisée :

```sh
pnpm release:package
pnpm release:verify
```

La procédure complète est dans `docs/release/packaging.md`.

## Exploitation headless

Le choix Cloud/Vercel, VPS, mutualisé ou hybride génère uniquement les artefacts compatibles dans `deployment/`. Consultez `docs/architecture/profiles.md`, `docs/operations/smoke-tests.md` et `docs/operations/backup-restore.md`. Les valeurs `example.invalid` sont volontairement non fonctionnelles : injectez les domaines et secrets au runtime sans les enregistrer dans Git.

Pour raccorder le frontend choisi par l'étudiant sans adopter de thème commun, consultez `docs/frontend/integration.md` et `docs/frontend/origin-matrix.md`. Stitch, Banani, les maquettes, l'IA explicitement demandée et les frontends personnalisés restent des workflows facultatifs.
