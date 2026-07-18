# Profil Cloud Vercel

Utiliser PostgreSQL avec URL pool?e au runtime et URL directe pour les migrations. D?ployer les migrations dans une ?tape explicite avant promotion, jamais dans une requ?te. Configurer les crons de `vercel.json`, limiter chaque lot et reprendre par curseur. Les previews utilisent des secrets et bases isol?s. V?rifier health, readiness et un parcours de connexion apr?s promotion. Sauvegarde : snapshot fournisseur + export chiffr?; rollback : promotion du d?ploiement pr?c?dent avec compatibilit? de migration v?rifi?e.
