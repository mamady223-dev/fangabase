# Orange Money Mali

Statut : `IMPLEMENTED_NEEDS_SANDBOX_UAT`.

L'identifiant canonique FangaBase est `orange_money_ml` et le nom affiché est
« Orange Money Mali ». Cette intégration est distincte des offres Orange Money
d'autres pays, de Moneroo et de Monero/XMR.

Orange Developer indique que Web Payment / M Payment est disponible au Mali,
mais dans un écosystème restreint réservé aux marchands enregistrés et
conformes KYA. Orange Mali confirme que le paiement en ligne est destiné aux
sites e-marchands partenaires. L'accès à l'API, ses paramètres définitifs et
les environnements utilisables restent donc soumis au contrat remis par Orange
Mali :

- [Orange Developer — Web Payment / M Payment](https://developer.orange.com/apis/om-webpay?hl=fr-fr)
- [Orange Mali — Sani web](https://www.orangemali.com/fr/paiement/sani-web.html)

Le flux technique observé fourni au projet confirme OAuth, création du
checkout, URL de paiement, `pay_token`, `notif_token` et interrogation du
statut. Il ne constitue pas un contrat universel. Les URL observées ne sont
jamais utilisées comme valeurs par défaut.

## Activation

Sélectionner « Orange Money Mali » dans le CLI ajoute
`orange_money_ml` à `payments.providers`, permet de le choisir comme
`default_provider`, génère le guide de déploiement et les variables suivantes :

```dotenv
ORANGE_MONEY_ENABLED=true
ORANGE_MONEY_ENVIRONMENT=sandbox
ORANGE_MONEY_COUNTRY=ML
ORANGE_MONEY_CURRENCY=XOF
ORANGE_MONEY_OAUTH_TOKEN_URL=
ORANGE_MONEY_API_BASE_URL=
ORANGE_MONEY_CLIENT_ID=
ORANGE_MONEY_CLIENT_SECRET=
ORANGE_MONEY_MERCHANT_ACCOUNT=
ORANGE_MONEY_MERCHANT_CODE=
ORANGE_MONEY_MERCHANT_KEY=
ORANGE_MONEY_RETURN_URL=
ORANGE_MONEY_CANCEL_URL=
ORANGE_MONEY_NOTIFICATION_URL=
ORANGE_MONEY_HTTP_TIMEOUT_SECONDS=15
```

Le questionnaire ne demande aucune clé. Sans sélection, aucune de ces
variables n'est générée et aucun service Orange ne démarre. En mode
`simulator`, les identifiants sont facultatifs. En `sandbox` ou `production`,
toutes les valeurs contractuelles doivent être fournies, sinon l'API répond
`PAYMENT_PROVIDER_NOT_CONFIGURED`.

## Routes

Les deux backends exposent les mêmes contrats :

- `POST /api/payments/checkouts` avec `provider=orange_money_ml` ;
- `POST /api/webhooks/orange-money-ml` ;
- `GET /api/payments/orange-money-ml/return?token=...` ;
- `GET /api/payments/orange-money-ml/cancel?token=...`.

Les routes `return` et `cancel` ne sont jamais autoritaires. Le navigateur
n'est pas cru. La notification ne marque jamais directement un paiement comme
payé : elle retrouve une référence connue puis déclenche une interrogation
serveur-à-serveur du statut. Tant que le contrat ne fournit pas une signature
vérifiable, cette interrogation est obligatoire.

## Invariants

- Le catalogue serveur fournit le montant ; une valeur client éventuelle est
  seulement comparée et rejetée en cas de divergence.
- Les montants XOF sont des entiers, sans conversion flottante ou automatique.
- L'ordre et la tentative sont créés avant l'appel externe.
- L'idempotence est scopée par propriétaire, opération et fournisseur.
- Les transitions confirmées passent par le moteur financier, le ledger et
  l'Outbox existants.
- Une divergence de montant ou devise produit `needs_review`.
- Un statut inconnu n'est jamais considéré comme payé.
- Les tokens OAuth sont mis en cache avec une marge fondée sur `expires_in`.
- Les `pay_token` et `notif_token` sont chiffrés au repos.
- Les clés marchandes, tokens, signatures et payloads bruts secrets ne sont
  jamais exposés au navigateur, aux logs, à l'audit ou à `provider_payload`.
- Les remboursements restent désactivés tant que le contrat Orange Mali ne les
  autorise pas explicitement.

## Simulateur et UAT

Le simulateur local couvre succès, attente, échec, annulation, timeout, valeur
inconnue et panne fournisseur, sans secret réel. Il ne représente pas une
sandbox officielle.

Avant la production, l'étudiant doit devenir marchand Orange Money auprès
d'Orange Mali, terminer la conformité KYA, obtenir le contrat et les
identifiants, configurer les URL HTTPS, exécuter les migrations, tester le
simulateur, réaliser la recette sandbox autorisée puis obtenir la validation
d'Orange Mali. La création des variables ne fournit pas automatiquement un
compte marchand.

Production et sandbox réelle : **UAT EXTERNE REQUISE**.
