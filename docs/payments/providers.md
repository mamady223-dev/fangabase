# Paiements

Le port commun expose cr?ation, statut, webhook, remboursement, payout, portail et rapprochement selon capacit?s. `ProviderRegistry` refuse une capacit? absente. `ContractSimulator` permet la CI sans compte externe mais ne constitue jamais une validation live.

Stripe et FedaPay n?cessitent encore un UAT sandbox document? avec compte r?el. Les autres fournisseurs restent `NEEDS_PROVIDER_CONTRACT` ou d?sactiv?s selon `templates/providers/STATUS.md`. Toute activation exige documentation officielle actuelle et tests succ?s, erreurs, timeout, non-JSON, signature, replay et redaction.
