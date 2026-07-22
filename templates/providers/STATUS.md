# Statut des fournisseurs

| Fournisseur                          | Statut                        | Preuve disponible                                                     |
| ------------------------------------ | ----------------------------- | --------------------------------------------------------------------- |
| Stripe                               | IMPLEMENTED_NEEDS_SANDBOX_UAT | Adaptateur Checkout/refund et webhook signe; UAT compte reel requise  |
| FedaPay                              | IMPLEMENTED_NEEDS_SANDBOX_UAT | Transaction/token/statut; webhook/refund bloques sans contrat complet |
| CinetPay, PayDunya, PayTech, Moneroo | NEEDS_PROVIDER_CONTRACT       | Port et tests g?n?riques                                              |
| Orange Money                         | NEEDS_PROVIDER_CONTRACT       | Contrat/pays requis                                                   |
| Bictorys                             | NEEDS_PROVIDER_CONTRACT       | Cl?s paiement/payout distinctes requises                              |
| Monero/XMR                           | DISABLED                      | Service de requete/polling isole; wallet RPC et UAT requis            |

Aucun mock n?est pr?sent? comme validation de production.
