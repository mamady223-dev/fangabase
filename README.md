# FangaBase

> Version en préparation : `0.2.0-rc.2`.

Orange Money Mali est disponible comme intégration facultative
`orange_money_ml`. Elle reste désactivée sans sélection et exige un contrat
marchand Orange Mali avant toute UAT réelle. Voir
[`docs/payments/orange-money-mali.md`](docs/payments/orange-money-mali.md).

FangaBase est headless et propose deux familles backend de même niveau :
Next.js autonome (`cloud_vercel`, `vps_next`) ou Laravel
(`vps_laravel`, `shared_laravel`, `hybrid`). Aucun chemin n'est recommandé par
défaut : le choix dépend de l'hébergement et reste celui de l'étudiant.

Le backend Next.js utilise PostgreSQL, `DATABASE_URL` poolée au runtime,
`DATABASE_DIRECT_URL` pour les migrations et `SESSION_SECRET`. Neon et
Supabase sont compatibles via leurs URLs PostgreSQL. Il ne requiert ni PHP, ni
Composer, ni `FANGABASE_API_ORIGIN`. Le profil hybride conserve Laravel comme
unique autorité et dirige les callbacks vers son API.

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

La version préparée est `0.1.0-rc.1`. FangaBase est distribué sous la [licence commerciale propriétaire](LICENSE), dont Mamady Traoré est l'auteur et le titulaire légal des droits, en qualité de CEO de Motechnova. Cette qualité professionnelle ne fait pas de Motechnova un titulaire juridique distinct.

Les étudiants autorisés peuvent utiliser et modifier FangaBase afin de créer et commercialiser leurs propres applications. Ils ne peuvent pas vendre, revendre, partager ou redistribuer FangaBase, ni l'intégrer à un template, kit, générateur ou produit concurrent destiné à des tiers. Les dépendances tierces conservent leurs propres licences. La licence du dépôt ne constitue pas un avis juridique professionnel.

Créer et vérifier l'archive autorisée :

```sh
pnpm release:package
pnpm release:verify
```

La procédure complète est dans `docs/release/packaging.md`.

## Exploitation headless

Le choix Cloud/Vercel, VPS, mutualisé ou hybride génère uniquement les artefacts compatibles dans `deployment/`. Consultez `docs/architecture/profiles.md`, `docs/operations/smoke-tests.md` et `docs/operations/backup-restore.md`. Les valeurs `example.invalid` sont volontairement non fonctionnelles : injectez les domaines et secrets au runtime sans les enregistrer dans Git.

Pour raccorder le frontend choisi par l'étudiant sans adopter de thème commun, consultez `docs/frontend/integration.md` et `docs/frontend/origin-matrix.md`. Stitch, Banani, les maquettes, l'IA explicitement demandée et les frontends personnalisés restent des workflows facultatifs.
