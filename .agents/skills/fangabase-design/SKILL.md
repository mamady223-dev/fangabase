---
name: fangabase-design
description: Intégrer explicitement un design demandé, une véritable source Banani disponible ou une maquette fournie, avec responsive et accessibilité. Ne jamais activer cette skill pour un travail backend ou pour inventer spontanément une interface.
---

# Intégrer un design choisi

Cette skill ne s’active que lorsque l’utilisateur demande explicitement une intégration ou génération d’interface, fournit une maquette, ou désigne une source Banani réellement accessible. FangaBase est headless : il n’existe aucun thème, palette, typographie ou design system visuel officiel.

1. Ne jamais l’activer automatiquement pendant un travail backend, sécurité, paiement, webhook ou infrastructure.
2. Vérifier que la source demandée existe réellement. Ne jamais inventer un serveur Banani, une maquette ou une direction artistique.
3. Utiliser Banani uniquement si une véritable source Banani est accessible dans l’environnement.
4. Utiliser fidèlement une maquette lorsque l’utilisateur la fournit.
5. Générer une UI uniquement sur demande explicite de l’utilisateur.
6. Inventorier les pages, états, composants et comportements de la source choisie, puis mapper vers les composants du projet.
7. Préserver navigation clavier, contraste, labels, focus, responsive et préférences de mouvement.
8. Implémenter les états vide, chargement, erreur et succès sans exposer d’exception interne.
9. Comparer le rendu à la source aux largeurs mobile et desktop, puis exécuter les tests applicables.

Lire `references/accessibility.md` uniquement lorsqu’un design est effectivement intégré.
