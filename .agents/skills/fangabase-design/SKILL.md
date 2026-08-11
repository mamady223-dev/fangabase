---
name: fangabase-design
description: Intégrer explicitement un frontend ou design demandé depuis Stitch, Banani réellement accessible, une maquette ou un frontend personnalisé. Ne jamais activer cette skill pour un travail backend ni inventer une interface ou une intégration fournisseur.
---

# Intégrer un frontend choisi

Cette skill est facultative. Elle ne s'active que lorsque l'utilisateur demande explicitement une intégration ou génération d'interface, fournit une maquette ou désigne une source réellement accessible. FangaBase est headless et ne possède aucun thème officiel.

1. Ne jamais l'activer automatiquement pendant un travail backend, sécurité, paiement, webhook ou infrastructure.
2. Inspecter d’abord `fangabase.config.yaml`, `ARCHITECTURE.md`, `docs/product/`, les contrats, les routes et le frontend réellement présents. Ne jamais supposer `apps/web` ou `apps/server`, ni modifier métier, CSRF, sessions, rôles ou finance pour faciliter une interface.
3. Vérifier que la source existe. Reconnaître Stitch, Banani, maquettes, génération explicitement demandée et frontend personnalisé, sans en imposer une.
4. Stitch reste externe : utiliser seulement ses références et instructions réelles, protéger sa clé et ne jamais en faire une dépendance runtime.
5. Utiliser Banani uniquement si une source ou instruction réelle est accessible. Ne jamais inventer URL MCP, clé, commande ou capacité ; conserver le secours HTML/CSS ou images fourni.
6. Utiliser fidèlement une maquette. Générer une UI uniquement sur demande explicite.
7. Inventorier écrans, états et comportements, puis les mapper uniquement vers les contrats et routes découverts dans le projet généré. Ne jamais inventer une route.
8. Faire valider le périmètre visuel avant une modification importante. Intégrer écran par écran sans réactiver automatiquement les exemples.
9. Préserver clavier, contraste, labels, focus, responsive et préférences de mouvement. Implémenter vide, chargement, erreur et succès sans exception interne.
10. Exiger une validation visuelle mobile/desktop et les tests fonctionnels d'authentification, CSRF, erreurs, permissions et API applicables.

Lire `references/accessibility.md` uniquement lorsqu'un design est effectivement intégré.

## Découverte selon l’architecture

| Architecture détectée    | Emplacement frontend attendu à confirmer           |
| ------------------------ | -------------------------------------------------- |
| Next.js autonome         | structure Next.js générée, généralement `apps/web` |
| Laravel/Blade            | `resources/views`                                  |
| Laravel/React/Inertia    | `resources/js` et `resources/views/app.blade.php`  |
| Laravel API + Next.js    | dossier frontend Next.js séparé                    |
| Laravel API + React/Vite | dossier frontend React séparé                      |
| Hybride Next.js          | frontend Next.js séparé                            |
| Hybride React            | frontend React séparé                              |

Cette matrice est un guide de découverte, jamais une autorité supérieure aux fichiers réellement générés.
