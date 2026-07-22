# IntÃ©gration facultative d'un frontend

FangaBase est headless et ne fournit aucun thÃ¨me, palette ou identitÃ© visuelle. La valeur par dÃ©faut est `design.source: headless`.

Sources autorisÃ©es :

- `headless` : aucun design gÃ©nÃ©rÃ© ;
- `stitch` : rÃ©fÃ©rences Stitch externes rÃ©ellement fournies, sans dÃ©pendance runtime ;
- `banani` : uniquement avec une vÃ©ritable source ou instruction Banani ;
- `provided_mockups` : maquettes fournies par l'Ã©tudiant ;
- `ai_generated` : uniquement sur demande explicite ;
- `custom_frontend` : frontend entiÃ¨rement choisi par l'Ã©tudiant.

Banani reste facultatif. Aucun serveur Banani n'est configurÃ© et aucune URL, clÃ© ou commande fictive ne doit Ãªtre ajoutÃ©e. Les pages de `examples/frontend-pages` sont remplaÃ§ables et non officielles.

Les assistants `Fanga_design_stitch.md` et `Fanga_design_Banani.md` ne sont actuellement pas prÃ©sents. S'ils sont fournis, les ajouter Ã  la racine pour audit sans les rÃ©inventer. Stitch est dÃ©clarÃ© testÃ© par l'utilisateur ; Banani MCP/abonnement reste UAT.

Lorsqu'un design rÃ©el est choisi, suivre `$fangabase-design` et appliquer responsive, accessibilitÃ©, validation visuelle et tests fonctionnels Ã  ce design uniquement.
