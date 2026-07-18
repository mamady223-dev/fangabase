# Exploitation

Surveiller health, readiness, profondeur/?ge des queues, Outbox DEAD, ?checs webhooks, paiements non terminaux et retraits en traitement. Rejouer un job DEAD via une action audit?e apr?s correction de sa cause. Le rapprochement signale les ?carts et n?applique jamais silencieusement une correction irr?versible.

Avant release : sauvegarder base et fichiers priv?s, tester la restauration, appliquer les migrations explicitement, lancer smoke, puis conserver le chemin de rollback. Docker absent sur ce poste : tests d?images et bases conteneuris?es class?s UAT en attente.
