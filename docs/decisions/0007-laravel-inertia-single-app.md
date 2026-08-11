# ADR 0007 — Laravel et React intégrés avec Inertia

Statut : accepté pour `0.4.0-rc.1`.

## Décision

FangaBase propose `laravel_inertia_react` sur VPS et hébergement mutualisé. Le projet généré est une seule application Laravel à la racine. Laravel demeure l’unique autorité métier, Inertia transporte des props minimales vers React et Vite produit les assets dans `public/build`.

Next.js n’est jamais placé dans `resources/js` : ses profils conservent une application et un déploiement séparés. Le profil Inertia n’est pas hybride, n’active pas le SSR par défaut et ne requiert aucun processus Node permanent en production.

## Conséquences

- sessions, cookies HttpOnly, CSRF, policies et validation restent sous contrôle Laravel ;
- aucune configuration CORS cross-origin ou URL d’API frontend n’est générée ;
- un unique `.env.example` est produit et les noms `VITE_*` susceptibles de contenir un secret sont refusés ;
- le build frontend doit être réalisé avant un déploiement mutualisé ;
- les huit architectures historiques restent disponibles et testées.
