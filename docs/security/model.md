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
