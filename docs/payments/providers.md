# Paiements

Le port commun declare paiement ponctuel, abonnement, mobile money, checkout heberge, redirection, confirmation synchrone/asynchrone, webhook, statut, remboursement et payout selon les capacites reelles. Le registre refuse un fournisseur desactive, une devise ou une capacite absente. Le simulateur contractuel permet la CI sans compte externe mais ne constitue jamais une validation live.

Stripe dispose d'un adaptateur checkout/statut/remboursement et d'un verificateur de webhook. FedaPay dispose d'un adaptateur transaction/token/statut; sa documentation publique demande la bibliotheque officielle pour verifier la signature sans publier ici l'algorithme complet, donc webhook et remboursement restent bloques. Les deux restent `IMPLEMENTED_NEEDS_SANDBOX_UAT` jusqu'a une recette avec compte marchand reel. CinetPay, PayDunya, Orange Money, Bictorys, PayTech et Moneroo restent `NEEDS_PROVIDER_CONTRACT`: aucun endpoint ou algorithme incomplet n'est invente. Monero reste `DISABLED` tant qu'un wallet RPC n'est pas fourni.

Le checkout central lit le prix et la devise du catalogue serveur, valide le proprietaire, la capacite et le chemin de retour, puis cree l'ordre et la tentative avant l'appel externe. Le navigateur ne confirme jamais un paiement. Seul un webhook verifie ou une reconciliation officielle peut appliquer une transition, le ledger et l'Outbox dans une transaction.

Activation d'urgence: laisser `STRIPE_ENABLED=false`, `FEDAPAY_ENABLED=false` ou `MONERO_ENABLED=false`. Les secrets sont fournis exclusivement par l'environnement. Les routes sensibles sont protegees par session et CSRF; le webhook Stripe utilise le corps brut, `Stripe-Signature`, une fenetre de cinq minutes et une limite de 1 Mio.

Sources contractuelles consultees le 22 juillet 2026 : [Stripe Checkout](https://docs.stripe.com/api/checkout/sessions), [webhooks Stripe](https://docs.stripe.com/webhooks), [remboursements Stripe](https://docs.stripe.com/refunds), [transactions FedaPay](https://docs.fedapay.com/api-reference/transactions/create), [token de paiement FedaPay](https://docs.fedapay.com/api-reference/transactions/create-token), [webhooks FedaPay](https://docs.fedapay.com/integration-api/en/webhooks-en) et [wallet RPC Monero](https://docs.getmonero.org/rpc-library/wallet-rpc/).

| Fournisseur                                                  | Capacites automatisees localement                                                         | Statut / limite                                                    |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Stripe                                                       | ponctuel, abonnement, checkout, redirection, statut, webhook, remboursement total/partiel | `IMPLEMENTED_NEEDS_SANDBOX_UAT`                                    |
| FedaPay                                                      | ponctuel/mobile money, checkout, redirection, statut                                      | `IMPLEMENTED_NEEDS_SANDBOX_UAT`; webhook/remboursement non actives |
| CinetPay, PayDunya, Orange Money, Bictorys, PayTech, Moneroo | aucune                                                                                    | `NEEDS_PROVIDER_CONTRACT`                                          |
| Monero                                                       | requete, taux verrouille, expiration, polling, confirmations, sous/sur-paiement           | `DISABLED`; wallet RPC et UAT requis                               |

Aucun payout n'est annonce par les adaptateurs du jalon 6. Le port `PayoutProvider` reste separe et une implementation ne pourra annoncer cette capacite qu'apres preuve contractuelle et UAT.

La matrice consolidée paiements, e-mail et stockage pour la release candidate se trouve dans `docs/quality/provider-matrix.md`.
