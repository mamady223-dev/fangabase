# Packaging de la release candidate

## Construire

Depuis un arbre Git contrôlé et sans secret :

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm release:package
pnpm release:verify
```

Les sorties ignorées par Git sont écrites dans `dist/release/` : archive ZIP, somme SHA-256, manifeste et SBOM CycloneDX. Les chemins proviennent de l'index Git, sont triés, les horodatages ZIP sont fixes et les fichiers sont stockés sans compression variable. Deux exécutions sur le même contenu doivent produire la même somme.

L'archive exclut `.git`, `.env`, secrets, logs, caches, bases locales, fichiers temporaires, `node_modules`, `vendor`, rapports Playwright et couverture. `.env.example` est volontairement conservé. Une recherche indépendante de motifs de secrets est effectuée à la création puis à la vérification.

Le package contient le code, les lockfiles, migrations, CLI, contrats, skills, documentation, exemples, configurations d'exemple, assistants Stitch/Banani facultatifs, avis tiers, changelog et projet de licence. Tant que le titulaire légal n'est pas renseigné, l'archive reste une RC technique non distribuable comme licence définitive.

## Vérifier l'intégrité

Comparer la somme calculée au fichier `.sha256`, puis lancer `pnpm release:verify`. Le vérificateur inspecte l'archive, les chemins interdits, les fichiers obligatoires, chaque SHA-256 du manifeste et les motifs de secrets. La CI ajoute une attestation de provenance GitHub à l'artefact.
