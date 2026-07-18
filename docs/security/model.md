# Mod?le de s?curit?

Les fronti?res sont navigateur, API, base, queue, stockage et fournisseurs. Les mutations cookie exigent cookie CSRF + en-t?te identiques. Les sessions tournent leur refresh token, d?tectent la r?utilisation et sont r?voqu?es lors d?une suspension ou d?un changement de mot de passe. Les policies filtrent par organisation et renvoient `NOT_FOUND` contre l?IDOR.

Les montants sont entiers, les ledgers immuables et l?idempotence est scop?e. Les webhooks sont born?s, v?rifi?s sur corps brut, uniques par fournisseur/?v?nement/type et monotones. Les fichiers sont priv?s, contr?l?s par signature et MIME. Les logs techniques expurgent secrets/PII et restent distincts de l?audit m?tier.

# Cycle d'identite Laravel

- Les jetons de verification et de reset sont aleatoires sur 256 bits, haches en base, courts, invalides apres usage et remplaces a chaque nouvelle demande.
- Les e-mails d'identite passent par `email_jobs` et l'Outbox. Le jeton necessaire au worker est chiffre avec `APP_KEY`; le fournisseur `local` ne permet sa lecture qu'en environnement local ou de test.
- Les refresh tokens et jetons CSRF sont haches en base. La rotation appartient a une famille; un replay revoque toute la famille.
- Les endpoints cookie-authentifies exigent le double-submit exact `fangabase_csrf` / `X-CSRF-TOKEN`.
- Google OAuth utilise PKCE S256, state hache, nonce, etat court a usage unique et chemins de retour explicitement autorises.

## UAT Google

Renseigner `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` et `GOOGLE_REDIRECT_URI` avec un client Google reel uniquement dans le coffre de l'environnement cible. Valider ensuite consentement, callback, rotation des cookies et refus d'un compte suspendu. Aucun secret Google n'est fourni dans le depot et cette recette live reste une UAT humaine.

## Isolation tenant et administration

- Les roles globaux restent `USER`, `ADMIN`, `SUPERADMIN`; les roles d'organisation restent `OWNER`, `ADMIN`, `MEMBER`. Un role tenant ne donne aucun droit plateforme.
- Chaque UUID d'organisation est resolu avec une adhesion `ACTIVE`; un UUID etranger ou devine renvoie `NOT_FOUND`. Le corps HTTP ne peut pas remplacer l'organisation de la route.
- Les invitations sont aleatoires sur 256 bits, hachees, expirees apres 24 heures, remplacees par une nouvelle invitation et consommees atomiquement.
- Le retrait ou la suspension d'une adhesion coupe immediatement tout acces. Une organisation suspendue reste lisible par ses membres actifs pour consultation et audit, mais aucune mutation tenant n'est autorisee.
- Seul un `SUPERADMIN` global peut suspendre ou changer les roles globaux. La suspension incremente la version de session et revoque tous les refresh tokens sans supprimer les historiques.
- Le dernier `SUPERADMIN` actif est protege dans une transaction avec verrouillage avant comptage. SQLite valide l'invariant sequentiel; une course reelle a deux transactions reste une UAT PostgreSQL obligatoire.
