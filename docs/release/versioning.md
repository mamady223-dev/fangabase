# Versionnement

FangaBase suit Semantic Versioning : `MAJEUR.MINEUR.CORRECTIF`. Une préversion ajoute `-rc.N`. La source de vérité de la release candidate est la version racine de `package.json`; les manifests workspace, le CLI et le contrat OpenAPI portent la même version et sont contrôlés par les tests.

- `0.1.0-rc.1` : première release candidate évaluée par les étudiants autorisés.
- Une nouvelle correction avant stabilité devient `0.1.0-rc.2`.
- `0.1.0` ne sera publié qu'après clôture des gates obligatoires, adoption de la licence et décision humaine explicite.

Une version stable, un tag ou une GitHub Release ne sont jamais créés automatiquement à partir d'une simple modification de code.
