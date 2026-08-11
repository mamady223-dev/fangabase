# FangaBase

> Version en préparation : `0.4.0-rc.1`.

FangaBase est un générateur de socles applicatifs headless. Il produit un projet indépendant avec une seule autorité backend : Next.js autonome (`cloud_vercel`, `vps_next`) ou Laravel (`vps_laravel`, `shared_laravel`, `hybrid`). Il n’impose ni métier, ni thème, ni identité graphique.

## Démarrage

Prérequis communs : Git, Node.js 22+ et pnpm 11+.

- Profils Next.js : aucun PHP ni Composer requis.
- Profils Laravel et hybrides : PHP 8.2+ et Composer 2.8+ requis.
- Docker reste facultatif et n’est jamais requis en hébergement mutualisé.

```sh
git clone https://github.com/mamady223-dev/fangabase.git FangaBase
cd FangaBase
pnpm install --frozen-lockfile
pnpm create:project
```

Le générateur accepte aussi un fichier déterministe :

```sh
pnpm create:project --config fangabase.config.example.yaml --destination ../mon-projet --dry-run --json
pnpm create:project --config fangabase.config.example.yaml --destination ../mon-projet --yes
```

Un brief produit conforme peut être fourni avec `--brief FANGABASE_INPUT.md`. Il doit contenir exactement un bloc clôturé `yaml fangabase`, validé par le même schéma. `--product-docs <dossier>` copie uniquement des fichiers Markdown sûrs dans `docs/product`; le générateur ne déduit aucun modèle métier de ces documents.

La destination doit être extérieure au dépôt source. Elle est construite dans un dossier temporaire, validée, inventoriée avec SHA-256 puis déplacée atomiquement. `.git`, dépendances installées, builds, fichiers `.env` locaux et secrets sont exclus.

Chaque projet généré expose `pnpm setup`, `pnpm doctor`, `pnpm migrate`, `pnpm dev`, `pnpm test`, `pnpm build` et `pnpm smoke:auth` lorsque l’identité est disponible. Consultez [le démarrage rapide](docs/getting-started/quickstart.md) et [les profils](docs/architecture/profiles.md).

Le profil `laravel_inertia_react` produit une seule application Laravel à la racine : React et TypeScript vivent dans `resources/js`, Inertia relie les routes Laravel aux pages React et Vite compile vers `public/build`. Il est disponible sur VPS et hébergement mutualisé, sans serveur Node permanent ni SSR en production. Les profils Laravel API + Next.js/React séparés restent inchangés.

## Services et paiements

Seuls les services sélectionnés sont documentés dans le projet généré. Aucun endpoint fournisseur n’est inventé. Moneroo reste `NEEDS_PROVIDER_CONTRACT` et n’est pas validé en sandbox. Orange Money Mali reste désactivé sans contrat marchand ni UAT officielle.

## Licence et release

FangaBase est distribué sous la [licence commerciale propriétaire](LICENSE). Mamady Traoré est l’auteur et le titulaire légal des droits, en qualité de CEO de Motechnova, sans faire de Motechnova un titulaire juridique distinct. Les étudiants autorisés peuvent créer et commercialiser leurs applications; ils ne peuvent ni partager, ni redistribuer, ni revendre FangaBase. Les dépendances tierces conservent leurs licences.

```sh
pnpm release:check
pnpm release:package
pnpm release:verify
```
