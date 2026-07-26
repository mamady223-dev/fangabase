# ADR 0006 — Autorité backend par profil

## Statut

Accepté pour `0.2.0-rc.1`. Cette décision remplace la portée globale de
l'ADR 0002, qui reste historique.

## Décision

Chaque génération installe une seule autorité métier :

| Profil           | Autorité        | Base                        | Frontend                |
| ---------------- | --------------- | --------------------------- | ----------------------- |
| `cloud_vercel`   | backend Next.js | PostgreSQL Neon ou Supabase | Next.js                 |
| `vps_next`       | backend Next.js | PostgreSQL                  | Next.js                 |
| `vps_laravel`    | Laravel         | PostgreSQL ou MySQL         | Blade, Next.js ou React |
| `shared_laravel` | Laravel         | PostgreSQL ou MySQL         | Blade ou React compilé  |
| `hybrid`         | Laravel API     | PostgreSQL ou MySQL         | Next.js ou React séparé |

Les contrats de `packages/contracts` définissent les routes, rôles, statuts et
invariants communs. Les implémentations restent séparées. Une application
n'exécute jamais deux autorités financières simultanées et aucun frontend
n'accepte, ne calcule ou ne confirme un montant faisant autorité.

## Conséquences

- le profil Next.js autonome ne requiert ni PHP, ni Composer, ni
  `FANGABASE_API_ORIGIN` ;
- le profil hybride dirige callbacks et webhooks vers Laravel ;
- MySQL n'est pas annoncé pour `vps_next` tant qu'une suite dédiée ne le
  prouve pas ;
- les fournisseurs externes restent soumis à leurs contrats et UAT réels.
