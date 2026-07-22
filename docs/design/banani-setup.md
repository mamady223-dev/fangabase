# Intégration facultative d'un frontend

FangaBase est headless et ne fournit aucun thème, palette ou identité visuelle. La valeur par défaut est `design.source: headless`.

Sources autorisées :

- `headless` : aucun design généré ;
- `stitch` : références Stitch externes réellement fournies, sans dépendance runtime ;
- `banani` : uniquement avec une véritable source ou instruction Banani ;
- `provided_mockups` : maquettes fournies par l'étudiant ;
- `ai_generated` : uniquement sur demande explicite ;
- `custom_frontend` : frontend entièrement choisi par l'étudiant.

Banani reste facultatif. Aucun serveur Banani n'est configuré et aucune URL, clé ou commande fictive ne doit être ajoutée. Les pages de `examples/frontend-pages` sont remplaçables et non officielles.

Les assistants `Fanga_design_stitch.md` et `Fanga_design_Banani.md` ne sont actuellement pas présents. S'ils sont fournis, les ajouter à la racine pour audit sans les réinventer. Stitch est déclaré testé par l'utilisateur ; Banani MCP/abonnement reste UAT.

Lorsqu'un design réel est choisi, suivre `$fangabase-design` et appliquer responsive, accessibilité, validation visuelle et tests fonctionnels à ce design uniquement.
