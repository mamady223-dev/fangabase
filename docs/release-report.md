# Rapport de release - 2026-07-22

Statut : **FAIL**. Le socle compile et ses tests actuels passent, mais la definition de termine du cahier n'est pas encore satisfaite.

- Construit : monorepo, CLI, contrats, noyau securite/finance/infrastructure, migrations, applications Next/Laravel minimales, profils headless, documentation, sept skills et six workflows CI.
- Profils : neuf configurations validees en dry-run; cinq familles documentees.
- Tests : 34 tests JS/TS passes; 80 tests PHP et 522 assertions passes; migrations SQLite testees.
- Builds : CLI, contrats, core et Next.js passes. Laravel s'execute via Composer/PHPUnit.
- Fournisseurs : contrat commun de capacites et statuts honnetes; checkout central a prix serveur; Stripe checkout/statut/refund/webhook signe; FedaPay transaction/token/statut; autres bloques sans contrat; Monero isole et desactive sans wallet RPC. Stripe/FedaPay restent `IMPLEMENTED_NEEDS_SANDBOX_UAT`, jamais presentes comme valides live.
- Identite Laravel : inscription/login persistants; verification e-mail et reset one-shot haches; demandes non enumerables et limitees; Outbox chiffree avec fournisseur local; rotation atomique, familles, replay, logout, suspension et CSRF double-submit; Google OAuth PKCE S256 injectable avec state/nonce et claims valides.
- Multi-tenant Laravel : organisations, adhesions et invitations persistantes; roles tenant separes des roles globaux; scoping systematique, policies et erreurs anti-enumeration; retrait/suspension immediats; mutations bloquees sur organisation suspendue.
- Administration : pagination bornee, suspension/reactivation utilisateurs et organisations, revocation des sessions, audit append-only et dernier SUPERADMIN actif protege sous transaction et verrouillage.
- Infrastructure : contrat transactionnel commun; fournisseurs local, Resend, Brevo et SMTP injectables; configuration incomplete sans reseau; Outbox SQL avec lots, baux recuperables, backoff avec jitter, historique, `SENT`/`DEAD` et replay audite; commande continue ou one-shot et ordonnanceur; stockage prive local durci et port distant commun pour S3/R2/Cloudinary/Supabase avec matrice de capacites.
- Finance commune : catalogue persistant et prix serveur versionnes; ledger de credits append-only, lots FEFO, reservations, expiration, remboursements, idempotence et audit; abonnements neutres avec transitions monotones et historique; entitlements sources et suspension; API anti-IDOR; interfaces fonctionnelles conservees comme exemples facultatifs.
- Frontend : application active reduite a un statut technique neutre; landing, dashboard, tarification et facturation de demonstration deplaces dans `examples/frontend-pages`; aucun theme, palette ou design officiel.
- Securite : corps brut, limite, signature, timestamp, replay, montant/devise/proprietaire, transitions monotones, idempotence, redirections et erreurs expurgees testes. `sharp` est force en 0.35.0 pour corriger les avis libvips eleves; audit npm sans haute/critique, deux avis moderes. Format, lint, typecheck, tests et builds verts. Composer confirme uniquement l'avis faible `firebase/php-jwt` (CVE-2025-45769), sans avis haut/critique.
- UAT : Google OAuth reel; Resend/Brevo/SMTP et stockages distants; Stripe checkout/webhook/refund et FedaPay transaction/statut avec comptes sandbox; signature/refund FedaPay apres contrat/bibliotheque officielle; wallet RPC Monero; concurrence credits, worker et dernier SUPERADMIN sur PostgreSQL/MySQL; Docker, images, restauration live et clone propre.
- Skills : `.agents/skills`; documentation : `docs` et `templates`.
- Actions humaines : fournir comptes sandbox et contrats marchands; installer Docker pour UAT; choisir une licence; retirer l'ACL CodexSandboxUsers avec la commande de `docs/progress.md` apres fin des travaux.
- Git : checkpoints jusqu'a `5f45714` publies sur `origin/main`; jalon 6 prepare pour publication.
