# Dependances tierces directes

FangaBase ne copie aucun code de kit tiers. Il utilise les dependances publiees suivantes via leurs gestionnaires de paquets.

| Dependances                           | Usage                      | Licence publiee |
| ------------------------------------- | -------------------------- | --------------- |
| Next.js, React, React DOM             | Application web            | MIT             |
| Zod, Commander, Prettier, Vitest, tsx | Validation, CLI et qualite | MIT             |
| yaml                                  | Lecture/ecriture YAML      | ISC             |
| TypeScript                            | Compilation                | Apache-2.0      |
| Laravel Framework, Laravel Tinker     | Backend PHP                | MIT             |
| PHPUnit                               | Tests PHP                  | BSD-3-Clause    |

Les versions resolues figurent dans `pnpm-lock.yaml` et `apps/server/composer.lock`. Les dependances transitives restent regies par leurs propres licences.
