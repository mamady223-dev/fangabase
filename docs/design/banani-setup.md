# Intégration facultative d’un design

FangaBase est headless et ne fournit aucun thème, aucune palette et aucune identité visuelle officielle. Le choix par défaut est `design.source: headless`.

Sources autorisées :

- `headless` : aucun design n’est généré ;
- `banani` : uniquement si une véritable source Banani est accessible ;
- `provided_mockups` : lorsqu’un étudiant fournit ses propres maquettes ;
- `ai_generated` : uniquement sur demande explicite de l’utilisateur.

Banani reste facultatif. Aucun serveur Banani n’est configuré dans cet environnement et aucune URL ou clé fictive ne doit être ajoutée. Les anciennes pages fonctionnelles sont conservées dans `examples/frontend-pages` comme exemples remplaçables, jamais comme interface officielle.

Lorsqu’un design est choisi, suivre `$fangabase-design` et appliquer responsive, accessibilité et tests à ce design uniquement.
