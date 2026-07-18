---
name: fangabase-release-audit
description: ?valuer une release FangaBase et produire PASS, PASS_WITH_WARNINGS ou FAIL. Utiliser avant publication, livraison, tag ou d?ploiement pour v?rifier qualit?, migrations, contrats, s?curit?, documentation, licences et profil g?n?r?.
---

# Auditer une release

1. Lire `docs/progress.md`, le manifeste et `references/release-gates.md`.
2. Ex?cuter installation fig?e, format, lint, typecheck, tests, contrats, parit? et builds.
3. Tester migrations et smoke des profils applicables; classer Docker et live comme UAT si l?environnement manque.
4. V?rifier aucun TODO/placeholder dans un flux obligatoire, aucun secret et aucune vuln?rabilit? haute/critique non accept?e.
5. Comparer variables lues, exemples et documentation.
6. V?rifier licences directes et statut honn?te de chaque fournisseur.
7. Produire FAIL si test obligatoire absent/rouge, migration non test?e, faille critique ou documentation trompeuse.
8. Produire PASS_WITH_WARNINGS uniquement pour UAT externe explicitement identifi?e.
9. Inclure chiffres r?els, builds, migrations, limites et prochaines actions humaines.
