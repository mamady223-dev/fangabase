# Mod?le de s?curit?

Les fronti?res sont navigateur, API, base, queue, stockage et fournisseurs. Les mutations cookie exigent cookie CSRF + en-t?te identiques. Les sessions tournent leur refresh token, d?tectent la r?utilisation et sont r?voqu?es lors d?une suspension ou d?un changement de mot de passe. Les policies filtrent par organisation et renvoient `NOT_FOUND` contre l?IDOR.

Les montants sont entiers, les ledgers immuables et l?idempotence est scop?e. Les webhooks sont born?s, v?rifi?s sur corps brut, uniques par fournisseur/?v?nement/type et monotones. Les fichiers sont priv?s, contr?l?s par signature et MIME. Les logs techniques expurgent secrets/PII et restent distincts de l?audit m?tier.
