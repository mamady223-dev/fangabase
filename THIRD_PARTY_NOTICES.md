# Dependances tierces directes

FangaBase ne copie aucun code de kit tiers. Il utilise les dependances publiees suivantes via leurs gestionnaires de paquets.

| Dependances                           | Usage                      | Licence publiee |
| ------------------------------------- | -------------------------- | --------------- |
| Next.js, React, React DOM             | Application web            | MIT             |
| Playwright                            | Tests navigateur           | Apache-2.0      |
| Zod, Commander, Prettier, Vitest, tsx | Validation, CLI et qualite | MIT             |
| yaml                                  | Lecture/ecriture YAML      | ISC             |
| TypeScript                            | Compilation                | Apache-2.0      |
| Laravel Framework, Laravel Tinker     | Backend PHP                | MIT             |
| Google API Client for PHP             | OAuth Google facultatif    | Apache-2.0      |
| PHPUnit                               | Tests PHP                  | BSD-3-Clause    |

Les versions resolues figurent dans `pnpm-lock.yaml` et `apps/server/composer.lock`. Les dependances transitives restent regies par leurs propres licences.

L'archive de release candidate contient `release/sbom.cdx.json`, inventaire CycloneDX généré depuis les manifests et le lockfile Composer. Il ne remplace pas les textes de licence publiés par chaque fournisseur. La licence propriétaire FangaBase ne s'applique jamais aux composants tiers au-delà des droits effectivement détenus par le titulaire.
