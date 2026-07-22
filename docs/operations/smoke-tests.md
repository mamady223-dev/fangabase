# Smoke tests de déploiement

```console
fangabase smoke --url https://api.example.invalid --frontend https://app.example.invalid --timeout 5000
```

`--url` est obligatoire et le frontend facultatif. La commande fait uniquement des GET sur health, liveness, readiness et le frontend. Elle n'envoie aucun e-mail, ne crée aucune donnée et ne touche jamais à la finance. Un HTTP en erreur, timeout ou secret apparent donne un code non nul avec un diagnostic par contrôle.

Le health détaillé reste protégé. Les endpoints publics ne publient que l'état, la version et des indicateurs expurgés. La readiness serveur agrège DB, migrations, stockage, Outbox, scheduler, worker et présence de configuration e-mail/paiement sans appeler les fournisseurs. Les contrôles internes non exposables restent observés par la plateforme.
