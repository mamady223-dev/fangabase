---
name: fangabase-payments
description: Ajouter, corriger ou auditer un fournisseur de paiement FangaBase, un webhook, remboursement, abonnement, payout ou rapprochement. Utiliser d?s qu?un flux financier ou un adaptateur Stripe, africain, Moneroo ou Monero est concern?.
---

# Travailler sur les paiements

1. Lire `AGENTS.md`, les contrats et `references/provider-gates.md`.
2. Consulter uniquement la documentation officielle actuelle du fournisseur; ne deviner aucun endpoint, en-t?te ou algorithme.
3. D?clarer les capacit?s r?elles et garder le module d?sactiv? si le contrat manque.
4. Stocker les montants en entiers, valider devise, compte marchand et prix serveur.
5. Scoper l?idempotence par propri?taire, op?ration et fournisseur.
6. V?rifier les webhooks sur corps brut avec taille, signature, fen?tre temporelle et unicit? fournisseur/?v?nement/type.
7. ?crire ?v?nement, transition et Outbox dans la m?me transaction.
8. Ajouter succ?s, 4xx, 5xx, timeout, non-JSON, champs manquants, signature, replay et redaction aux tests.
9. Classer honn?tement le r?sultat : automatis?, UAT sandbox, contrat requis ou d?sactiv?.
