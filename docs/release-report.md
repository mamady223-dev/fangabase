# Rapport de release - 2026-07-18

Statut : **FAIL**. Le socle compile et ses tests actuels passent, mais la definition de termine du cahier n'est pas encore satisfaite.

- Construit : monorepo, CLI, contrats, noyau securite/finance/infrastructure, migrations, applications Next/Laravel minimales, profils, design initial, documentation, sept skills et six workflows CI.
- Profils : neuf configurations validees en dry-run; cinq familles documentees.
- Tests : 26 tests JS/TS passes; 27 tests PHP et 195 assertions passes; migrations SQLite testees.
- Builds : CLI, contrats, core et Next.js passes. Laravel s'execute via Composer/PHPUnit.
- Fournisseurs : simulateur contractuel seulement. Stripe/FedaPay et autres ne sont pas presentes comme implementes live.
- Identite Laravel : inscription/login persistants; verification e-mail et reset one-shot haches; demandes non enumerables et limitees; Outbox chiffree avec fournisseur local; rotation atomique, familles, replay, logout, suspension et CSRF double-submit; Google OAuth PKCE S256 injectable avec state/nonce et claims valides.
- Securite : format, lint, typecheck et `pnpm release:check` verts; audit npm sans haute/critique, deux avis moderes; Composer signale un avis faible `firebase/php-jwt` (CVE-2025-45769), sans avis haut/critique.
- UAT : Google OAuth reel sans secret dans le depot; Docker, PostgreSQL/MySQL, images, sandbox fournisseurs, restauration live et clone propre en attente.
- Skills : `.agents/skills`; documentation : `docs` et `templates`.
- Actions humaines : fournir comptes sandbox et contrats marchands; installer Docker pour UAT; choisir une licence; retirer l'ACL CodexSandboxUsers avec la commande de `docs/progress.md` apres fin des travaux.
- Git : checkpoint de fondation `b67d885` publie sur `origin/main`; nouveau lot d'identite prepare pour publication.
