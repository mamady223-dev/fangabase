# Démarrage rapide

Clonez le dépôt dans le dossier canonique :

```sh
git clone https://github.com/mamady223-dev/fangabase.git FangaBase
cd FangaBase
pnpm install --frozen-lockfile
pnpm create:project
```

Node.js 22 et pnpm 11 sont communs à tous les profils. PHP 8.2 et Composer 2.8 ne sont requis que pour Laravel ou un profil hybride. Docker est facultatif.

Le questionnaire choisit le déploiement, l’autorité backend, le frontend, la base, l’e-mail, les paiements, la facturation et la source frontend. Le type de produit reste descriptif. Avant toute écriture, le CLI affiche la destination, les inclusions, les exclusions, les commandes et les avertissements.

En automatisation :

```sh
pnpm create:project --config fangabase.config.example.yaml --destination ../mon-projet --dry-run --json
pnpm create:project --config fangabase.config.example.yaml --destination ../mon-projet --yes
cd ../mon-projet
pnpm setup
pnpm doctor
pnpm migrate
pnpm test
pnpm build
```

Un brief validé peut remplacer `--config` avec `--brief FANGABASE_INPUT.md`. Les deux options sont mutuellement exclusives. Les documents produit facultatifs passent par `--product-docs`; seuls les Markdown racine ordinaires et de taille limitée sont copiés.

Pour le smoke d’identité, démarrez le backend local avec le fournisseur de test, définissez au besoin `FANGABASE_SMOKE_URL`, puis lancez `pnpm smoke:auth`. Le script refuse la production, crée un utilisateur unique, vérifie l’e-mail, ouvre et renouvelle la session, se déconnecte puis vérifie son invalidation. Aucun endpoint public de récupération de jeton n’est ajouté.

Les sources visuelles restent facultatives. FangaBase est headless et ne fournit aucun thème officiel.
