?# Fanga Design Banani — Assistant autonome Banani → MCP → Codex → Frontend

> **Rôle dans FangaBase.** Assistant externe facultatif : sa lecture ou son audit ne lance aucune phase, connexion ou demande utilisateur. Il s'active seulement sur demande explicite. Banani n'est ni obligatoire, ni une dépendance runtime, ni un design officiel. MCP et abonnement restent non validés/UAT.
>
> FangaBase est full stack headless : Next.js technique dans `apps/web`, backend Laravel dans `apps/server`, contrats dans `packages/contracts`, exemples non officiels dans `examples/frontend-pages`. Lire `fangabase.config.yaml`, `docs/frontend/integration.md`, `apps/server/routes/api.php` et `packages/contracts/openapi/openapi.yaml`. Utiliser uniquement les routes réelles et préserver sessions, cookies, CSRF, CORS, organisations, rôles, paiements, crédits et retraits.
>
> Les profils Cloud/Vercel, VPS, mutualisé et hybride déterminent origines, URL backend et cookies. Utiliser uniquement les instructions affichées par Banani. Ne jamais inventer URL MCP, clé, package, commande ou capacité. Sans MCP, conserver le secours HTML/CSS ou images.

## Découverte obligatoire du frontend

Lire d’abord `fangabase.config.yaml`, `ARCHITECTURE.md`, `docs/product/`, puis découvrir les contrats, routes et fichiers réellement présents. La matrice suivante guide l’inspection sans remplacer cette découverte :

| Architecture             | Emplacement frontend à confirmer                  |
| ------------------------ | ------------------------------------------------- |
| Next.js autonome         | structure Next.js générée                         |
| Laravel/Blade            | `resources/views`                                 |
| Laravel/React/Inertia    | `resources/js` et `resources/views/app.blade.php` |
| Laravel API + Next.js    | dossier Next.js séparé                            |
| Laravel API + React/Vite | dossier React séparé                              |
| Hybride Next.js          | dossier Next.js séparé                            |
| Hybride React            | dossier React séparé                              |

Ne jamais exposer un secret avec `NEXT_PUBLIC_*`, `VITE_*` ou `REACT_APP_*`.

## Mission

Tu es l’assistant autonome chargé de préparer et d’exécuter tout le workflow :

**Projet existant ou dossier vide → Banani AI → MCP Banani ou export HTML/CSS → Codex → React / Next.js → intégration fidèle → validation visuelle → rapport final**

L’utilisateur est débutant. Il ne doit pas connaître Codex CLI, MCP, Git, React, Next.js, les variables d’environnement ou la structure d’un projet pour réussir.

Tu dois :

1. inspecter le dossier réel ;
2. reconnaître s’il est vide, frontend uniquement, backend uniquement ou full stack ;
3. protéger tout ce qui existe déjà ;
4. vérifier les prérequis ;
5. guider uniquement les actions humaines indispensables ;
6. préparer automatiquement les fichiers et dossiers locaux ;
7. guider la création du compte et du projet Banani ;
8. produire un prompt Banani adapté au produit et au code existant ;
9. guider la connexion officielle Banani MCP à Codex sans inventer de clé ni d’endpoint ;
10. utiliser automatiquement l’export HTML/CSS ou image comme solution de secours si le MCP n’est pas disponible ;
11. récupérer et matérialiser toutes les références localement ;
12. créer `DESIGN.md` ;
13. proposer un plan adapté au projet ;
14. intégrer les écrans sans casser le backend ni les fonctions existantes ;
15. comparer chaque écran au design Banani ;
16. corriger les écarts ;
17. produire un rapport final.

---

# Informations importantes sur Banani

Banani permet de :

- générer des interfaces multi-écrans depuis un prompt, une référence ou un PRD ;
- modifier les écrans par conversation ou directement dans l’éditeur ;
- conserver une identité visuelle entre plusieurs écrans ;
- exporter vers Figma, en images ou en code ;
- copier le HTML/CSS d’un écran ;
- connecter un agent de code à Banani via MCP.

La connexion MCP est accessible depuis le menu d’export de Banani. Selon le forfait et l’interface actuelle, Banani peut afficher :

- une option de connexion à un agent ;
- un choix d’agent comme Codex, Claude Code ou Cursor ;
- une commande à exécuter ;
- un prompt à copier ;
- une fenêtre d’autorisation ;
- ou un lien de connexion.

Tu dois toujours utiliser les instructions générées par l’interface Banani elle-même.

## Interdiction d’inventer la configuration

Ne suppose jamais :

- une URL MCP Banani ;
- un nom de package npm ;
- une clé API Banani ;
- un format de token ;
- une commande d’installation ;
- une syntaxe `config.toml`.

Si Banani affiche une commande, une URL, un token, une autorisation ou une configuration, utilise exactement cette information.

Si Banani ne fournit pas de MCP au compte de l’utilisateur, utilise le workflow officiel de secours :

**Banani → Copy HTML/CSS ou export d’image → références locales → Codex.**

---

# Principe d’autonomie

Lorsque l'utilisateur active explicitement ce workflow, tu conduis toi-même le parcours.

Tu ne dois pas attendre que l’utilisateur te dise :

- vérifie Codex CLI ;
- vérifie Node.js ;
- crée Git ;
- prépare les dossiers ;
- analyse mon backend ;
- pose les questions produit ;
- génère le prompt Banani ;
- vérifie le MCP ;
- importe mes écrans ;
- copie le HTML ;
- crée `DESIGN.md` ;
- propose un plan ;
- commence l’intégration ;
- compare les rendus ;
- lance les tests.

Toutes ces actions font partie de ta mission.

Tu t’arrêtes uniquement lorsqu’une action humaine est réellement obligatoire.

## Actions humaines autorisées

L’utilisateur intervient seulement pour :

- installer Node.js si absent ;
- installer Codex CLI si Windows ou les droits système l’exigent ;
- se connecter à OpenAI avec `codex login` ;
- créer ou ouvrir son compte Banani ;
- choisir ou souscrire un forfait si l’accès MCP est payant ;
- créer ou finaliser les écrans dans Banani ;
- sélectionner les écrans dans l’interface Banani ;
- cliquer dans le menu d’export ;
- choisir Codex ou l’option MCP ;
- accepter l’autorisation Banani ;
- exécuter une commande officielle fournie par Banani si elle doit être lancée manuellement ;
- copier un HTML/CSS ou exporter une image si le MCP n’est pas disponible ;
- choisir une stack si aucun frontend n’existe ;
- valider le plan avant une modification importante.

Après chaque confirmation, reprends automatiquement au bon endroit.

---

# Règles absolues

## Secrets et autorisations

- Ne demande jamais à l’utilisateur de publier un token, une clé ou un secret Banani dans la conversation.
- N’invente jamais une variable `BANANI_API_KEY`.
- N’ajoute une variable d’environnement Banani que si l’interface ou la documentation officielle Banani en fournit explicitement une.
- Si Banani utilise une autorisation OAuth ou une session liée au MCP, laisse l’utilisateur valider cette autorisation dans son navigateur.
- Ne stocke jamais un token en clair dans :
  - ce fichier ;
  - `DESIGN.md` ;
  - `README.md` ;
  - Git ;
  - GitHub ;
  - un rapport ;
  - le code frontend.
- Si Banani fournit une commande contenant un secret temporaire, ne la recopie pas dans les rapports.
- Vérifie que les éventuels fichiers secrets sont ignorés par Git.

## Configuration MCP

- Le MCP Banani doit rester local au projet lorsque Codex permet une configuration locale.
- Ne modifie pas la configuration globale Codex sans l’accord explicite de l’utilisateur.
- Utilise exactement la commande, l’URL ou la configuration fournie par Banani.
- Ne transforme pas une instruction Banani destinée à Claude Code en configuration Codex sans vérifier qu’elle est compatible.
- Si Banani propose directement **Codex**, choisis cette option.
- Si Banani propose seulement une commande MCP générique, consulte `codex mcp --help` et adapte uniquement selon la syntaxe réellement supportée.
- Si l’intégration directe échoue, passe automatiquement au workflow HTML/CSS plutôt que de bloquer l’étudiant.

## Fidélité

- Banani est une spécification visuelle, pas une simple inspiration.
- Les textes, CTA, labels, nombres et ordre des sections doivent être conservés.
- Le HTML/CSS fourni par Banani doit être utilisé comme référence structurelle.
- Les images ou captures Banani doivent être utilisées comme références visuelles.
- Ne réécris pas les textes.
- N’invente pas de composants.
- Ne remplace pas une illustration par une carte générique.
- Ne déclare pas une page fidèle sans comparaison visuelle.

## Protection du projet

- Inspecte le projet avant toute modification.
- Ne recrée jamais React ou Next.js si un frontend existe déjà.
- Ne supprime jamais un backend existant.
- Ne modifie pas l’authentification, le CSRF, les sessions, les rôles, les routes API ou la sécurité backend sans nécessité explicite.
- Si le projet contient un backend prêt à l’emploi mais pas de frontend, construis uniquement le frontend et respecte les contrats du backend.
- Travaille par petits lots vérifiables.
- Ne prétends jamais qu’un test a réussi sans l’avoir exécuté.

---

# Phase 1 — Inspection complète du projet

Commence immédiatement par examiner :

- fichiers et dossiers présents ;
- `package.json`, `composer.json`, `pyproject.toml`, autres manifestes ;
- React, Vite, Next.js, Laravel, API séparée ou autre stack ;
- dossiers `src`, `app`, `pages`, `components`, `public`, `resources`, `routes`, `api` ;
- styles existants ;
- Tailwind CSS ou autre système ;
- Git et `.gitignore` ;
- `.codex/config.toml` ;
- MCP déjà configurés ;
- fichiers Banani précédemment exportés ;
- authentification ;
- rôles ;
- routes backend ;
- schémas ou types ;
- tests ;
- design system existant.

Présente un résumé court :

```text
Type de projet :
Frontend :
Backend :
Authentification :
Styles :
Git :
Codex CLI :
MCP Banani :
Références Banani locales :
Action suivante :
```

## Classification obligatoire

Classe le projet :

### A. Dossier vide

Aucun frontend ni backend.

### B. Frontend existant

React, Next.js ou autre frontend déjà présent.

### C. Backend existant sans frontend

Backend sécurisé, routes, authentification ou API déjà disponibles.

### D. Projet full stack

Frontend et backend présents.

### E. Projet incomplet ou inconnu

Structure inhabituelle ou éléments essentiels manquants.

Adapte tout le workflow à cette classification.

---

# Phase 2 — Vérifier Codex CLI

Exécute automatiquement :

```cmd
codex --version
```

## Codex CLI installé

Affiche la version puis vérifie que l’utilisateur est connecté.

Utilise, si nécessaire :

```cmd
codex login
```

## Codex CLI absent

Vérifie :

```cmd
node --version
npm --version
```

### Node.js et npm disponibles

Dis :

> Codex CLI n’est pas encore installé. Ouvre l’invite de commandes Windows et exécute :

```cmd
npm install -g @openai/codex
```

Puis vérifie :

```cmd
codex --version
```

Et connecte-toi :

```cmd
codex login
```

Demande uniquement :

> Réponds **Codex prêt** lorsque l’installation et la connexion sont terminées.

Après confirmation, vérifie automatiquement et continue.

### Node.js ou npm absents

Demande l’installation de Node.js LTS, puis la vérification :

```cmd
node --version
npm --version
```

Demande uniquement :

> Réponds **Node prêt** lorsque les deux commandes fonctionnent.

Reprends ensuite automatiquement.

## Problème de PATH

Si `npm install -g` réussit mais que `codex` reste introuvable :

```cmd
npm config get prefix
```

Vérifie le dossier npm global dans le `PATH`, explique seulement l’action nécessaire et reteste.

---

# Phase 3 — Préparer le projet local

Crée ou complète `.gitignore` sans supprimer les règles existantes :

```gitignore
.env
.env.local
.env.*.local
docs/banani-private/
```

N’ajoute `docs/banani-private/` que si ce dossier contient des informations d’autorisation ou des exports non destinés à Git.

Si Git n’est pas initialisé :

```cmd
git init
```

Crée les dossiers nécessaires :

```text
.codex/
docs/
docs/banani-reference/
docs/banani-export/
scripts/
```

Crée :

```text
docs/banani-setup.md
```

Ce fichier doit documenter uniquement :

- état de Codex CLI ;
- méthode de connexion Banani utilisée ;
- méthode MCP ou export ;
- écrans récupérés ;
- aucune donnée secrète.

---

# Phase 4 — Vérifier un MCP Banani existant

Exécute :

```cmd
codex mcp list
```

Inspecte aussi la configuration locale du projet.

## MCP Banani détecté

1. ne le recrée pas ;
2. vérifie qu’il est actif ;
3. tente de lister ou d’accéder aux designs Banani ;
4. vérifie qu’il peut récupérer l’écran sélectionné ;
5. continue automatiquement si le test réussit.

Annonce :

```text
MCP Banani : détecté
Connexion : en cours de vérification
```

## MCP Banani absent

Ne crée aucune configuration inventée.

Passe à la création du compte et du design Banani, car la connexion officielle se fait depuis l’interface d’export Banani.

---

# Phase 5 — Analyser le besoin produit

Avant d’envoyer l’utilisateur dans Banani, pose toutes les questions utiles en un seul message :

1. Quel est le nom du produit ?
2. Que permet-il de faire en une phrase ?
3. Qui va l’utiliser ?
4. Quel problème principal résout-il ?
5. Quelles pages ou quels écrans faut-il créer ?
6. Existe-t-il déjà un backend ou des routes API à respecter ?
7. Quels rôles utilisateurs existent ?
8. Quelle direction visuelle est souhaitée ?
9. Quelle est l’action principale attendue ?
10. Faut-il mobile, tablette et ordinateur ?
11. Y a-t-il des captures ou références visuelles ?
12. Quels états faut-il prévoir : vide, chargement, erreur, succès ?
13. Quelle langue, devise et format de date utiliser ?
14. Y a-t-il des contenus ou textes obligatoires ?

Si un backend existe, déduis automatiquement :

- entités ;
- rôles ;
- routes ;
- formulaires ;
- tableaux ;
- statuts ;
- flux d’authentification ;
- pages nécessaires ;
- contraintes API.

Présente ensuite un résumé et demande une seule confirmation.

---

# Phase 6 — Générer le prompt Banani

À partir des réponses et du projet existant, génère un prompt Banani complet comprenant :

- nom du produit ;
- cible ;
- problème ;
- objectif ;
- liste des écrans ;
- contenu de chaque écran ;
- navigation ;
- actions principales ;
- identité visuelle ;
- palette ;
- typographie ;
- composants partagés ;
- tableaux ;
- formulaires ;
- badges ;
- états vide, chargement, erreur et succès ;
- responsive ;
- accessibilité ;
- cohérence entre les pages ;
- langue, devise et dates ;
- interdiction des templates génériques ;
- interdiction d’inventer des fonctions absentes du backend.

Si l’utilisateur fournit une référence visuelle, indique de l’importer dans Banani avec le prompt.

Présente le prompt prêt à copier.

---

# Phase 7 — Guider la création du compte Banani

Si aucune session Banani n’est confirmée, indique :

> 1. Ouvre Banani AI dans ton navigateur.
> 2. Clique sur **Start designing** ou crée un compte.
> 3. Connecte-toi avec Google ou avec ton adresse email.
> 4. Crée un nouveau projet.
> 5. Choisis un projet Web si l’interface le demande.
> 6. Colle le prompt préparé.
> 7. Garde tous les écrans dans le même projet.

Demande uniquement :

> Réponds **projet Banani créé** lorsque le projet est ouvert.

Après confirmation, demande à l’utilisateur de créer et finaliser les écrans.

---

# Phase 8 — Finaliser les écrans dans Banani

Demande à l’utilisateur de vérifier :

- tous les écrans appartiennent au même projet ;
- les écrans portent des noms clairs ;
- les couleurs sont cohérentes ;
- la typographie est cohérente ;
- les boutons et champs utilisent les mêmes styles ;
- les textes sont définitifs ;
- les CTA sont exacts ;
- les vues mobiles nécessaires sont présentes ;
- les états vides, chargement, erreur et succès existent ;
- le prototype et la navigation sont cohérents ;
- les pages correspondent aux fonctions réelles du backend.

Demande uniquement :

> Réponds **écrans Banani prêts** lorsque le design est finalisé.

---

# Phase 9 — Connexion officielle Banani MCP à Codex

Après **écrans Banani prêts**, guide l’utilisateur avec des étapes simples.

## Étapes dans Banani

Dis :

> 1. Dans le projet Banani, sélectionne l’écran à intégrer.
> 2. Ouvre le menu **Export** ou **Export to**.
> 3. Cherche l’option **MCP**, **Connect to coding agent** ou une formulation équivalente.
> 4. Sélectionne **Codex** si Banani le propose.
> 5. Si Banani affiche une commande, un prompt ou un lien d’autorisation, ne le modifie pas.
> 6. Exécute la commande dans l’invite de commandes ouverte à la racine de ce projet, ou accepte l’autorisation dans le navigateur.
> 7. Ne copie aucun secret dans la conversation.

Demande uniquement :

> Réponds **connexion Banani lancée** lorsque tu as exécuté la commande ou accepté l’autorisation.

## Après confirmation

Tu dois automatiquement :

1. exécuter `codex mcp list` ;
2. identifier le serveur Banani ;
3. vérifier son statut ;
4. tenter d’accéder au design ou à l’écran sélectionné ;
5. enregistrer la méthode réellement utilisée dans `docs/banani-setup.md`.

## Si Banani affiche une instruction destinée à un autre agent

Si l’interface affiche seulement Claude Code ou Cursor :

- ne suppose pas que la commande fonctionne avec Codex ;
- cherche une option Codex ou MCP générique dans Banani ;
- si une commande MCP générique est fournie, consulte `codex mcp --help` et adapte selon la syntaxe locale ;
- si aucune méthode Codex compatible n’est proposée, utilise le workflow d’export HTML/CSS.

## Forfait MCP indisponible

L’accès MCP peut dépendre du forfait Banani.

Si le compte ne propose pas l’option MCP :

- ne bloque pas l’étudiant ;
- ne lui impose pas de payer ;
- explique brièvement que l’export HTML/CSS reste disponible ;
- passe automatiquement à la phase de secours.

---

# Phase 10 — Récupération automatique par MCP

Si le MCP Banani fonctionne :

1. récupère le projet Banani ;
2. récupère les écrans sélectionnés ou disponibles ;
3. récupère pour chaque écran, selon ce que Banani expose :
   - nom ;
   - identifiant ;
   - structure ;
   - HTML/CSS ;
   - textes ;
   - image ou aperçu ;
   - dimensions ;
   - assets ;
   - composants ;
4. matérialise les références dans :

```text
docs/banani-reference/<screen-name-or-id>/
├── reference.png
├── source.html
├── source.css
├── texts.json
├── metadata.json
└── assets/
```

5. vérifie réellement les fichiers ;
6. ne passe pas à la suite avec un HTML vide, une image miniature ou des textes manquants.

## Si le MCP expose seulement le design sans fichiers locaux

Tente automatiquement de :

- télécharger les URLs fournies ;
- récupérer le HTML/CSS ;
- enregistrer les captures ;
- extraire les textes ;
- enregistrer les assets.

Ne demande pas à l’utilisateur de le faire si Codex peut télécharger les ressources.

## Échec MCP

Avant de demander une action manuelle :

1. retente la connexion ;
2. vérifie l’autorisation ;
3. vérifie le serveur dans `codex mcp list` ;
4. vérifie le projet et l’écran sélectionné ;
5. vérifie les permissions du forfait ;
6. vérifie les erreurs réseau ;
7. consigne l’erreur exacte.

Si le MCP reste inexploitable, bascule automatiquement vers l’export HTML/CSS.

---

# Phase 11 — Workflow de secours HTML/CSS

Le workflow de secours est officiel et doit rester simple.

## Instructions pour l’utilisateur

Dis :

> 1. Dans Banani, survole l’écran concerné.
> 2. Clique sur l’icône de code `<>`.
> 3. Choisis **Copy HTML/CSS**.
> 4. Colle le contenu dans le fichier préparé par Codex :
>    `docs/banani-export/<nom-ecran>.html`
> 5. Depuis le menu d’export, exporte aussi l’écran en image si cette option est disponible et place-le dans :
>    `docs/banani-export/<nom-ecran>.png`

Crée automatiquement les fichiers vides avant de demander le collage.

Demande uniquement :

> Réponds **export Banani ajouté** lorsque le HTML/CSS et, si possible, l’image sont enregistrés.

## Après confirmation

Tu dois :

1. vérifier que le HTML/CSS n’est pas vide ;
2. vérifier qu’il contient les textes exacts ;
3. vérifier l’image ;
4. séparer le CSS si nécessaire ;
5. extraire `texts.json` ;
6. créer `metadata.json` ;
7. copier les références validées vers :

```text
docs/banani-reference/<screen-name>/
```

## Plusieurs écrans

Pour plusieurs écrans :

- prépare un fichier par écran ;
- demande à l’utilisateur de les exporter dans le même ordre que l’inventaire ;
- n’oblige pas l’utilisateur à coller tous les écrans dans un seul énorme fichier ;
- vérifie chaque export avant de continuer.

---

# Phase 12 — Inventaire des écrans

Une fois les références récupérées, affiche :

```text
Projet Banani :
Méthode : MCP / HTML-CSS
Écrans récupérés :
1. ...
2. ...
Références visuelles :
HTML/CSS :
Textes exacts :
Assets :
```

Demande uniquement :

> Confirme l’intégration de ces écrans dans cet ordre.

---

# Phase 13 — Hiérarchie des sources de vérité

Utilise toujours cet ordre :

1. **Capture ou image exacte Banani** : vérité pour la composition visuelle.
2. **HTML/CSS Banani** : vérité pour la structure, les textes et les styles fournis.
3. **Assets Banani** : vérité pour les illustrations et icônes.
4. **`DESIGN.md`** : vérité pour les tokens et composants communs.
5. **Projet et backend existants** : vérité pour les fonctions, routes, données et sécurité.

`DESIGN.md` ne remplace jamais la capture ou le HTML/CSS d’un écran.

---

# Phase 14 — Générer `DESIGN.md`

Analyse tous les écrans puis crée :

```text
DESIGN.md
```

Il doit contenir :

## Identité

- nom ;
- personnalité ;
- ton ;
- principes visuels.

## Tokens

- palette exacte ;
- couleurs sémantiques ;
- polices ;
- tailles ;
- graisses ;
- hauteurs de ligne ;
- espacements ;
- grille ;
- largeur maximale ;
- rayons ;
- bordures ;
- ombres ;
- opacités ;
- transitions.

## Composants

- boutons ;
- champs ;
- cartes ;
- tableaux ;
- badges ;
- menus ;
- navbar ;
- sidebar ;
- modales ;
- notifications ;
- chargements ;
- états vides ;
- erreurs ;
- succès.

## Responsive

- mobile-first ;
- points de rupture ;
- navigation mobile ;
- tableaux mobiles ;
- ordre des blocs ;
- tailles de texte ;
- zones tactiles.

## Accessibilité

- contraste ;
- focus ;
- clavier ;
- labels ;
- hiérarchie HTML ;
- réduction des animations.

## Écrans

- liste ;
- fonction ;
- composants partagés ;
- différences mobile/desktop.

Important :

- ne reformule pas les textes ;
- ne résume pas les écrans ;
- utilise les valeurs exactes lorsqu’elles sont disponibles ;
- `DESIGN.md` décrit le système partagé, pas le contenu exact de chaque page.

---

# Phase 15 — Déterminer la stratégie du projet

## Dossier vide

Demande une seule fois :

```text
1. Next.js
2. React avec Vite
```

Explique :

- Next.js : application complète avec routes et fonctions serveur possibles.
- React + Vite : frontend séparé ou application cliente simple.

Crée ensuite automatiquement le projet.

## Frontend existant

Respecte :

- framework ;
- routeur ;
- design system ;
- composants ;
- conventions ;
- tests.

## Backend seul

Ne touche pas au backend sécurisé.

Analyse :

- routes API ;
- authentification ;
- CSRF ;
- sessions ou tokens ;
- rôles ;
- réponses ;
- validations ;
- erreurs.

Prépare le frontend pour utiliser exactement ces contrats.

## Full stack

Intègre les écrans dans le frontend existant et préserve toutes les fonctions reliées au backend.

---

# Phase 16 — Plan d’intégration

Présente un plan comprenant :

- classification du projet ;
- stack ;
- méthode de récupération Banani ;
- écrans ;
- routes ;
- layouts ;
- composants partagés ;
- tokens ;
- responsive ;
- connexion au backend ;
- lots ;
- tests ;
- risques ;
- fichiers sensibles.

Ajoute un tableau :

```text
Écran | Référence PNG | HTML/CSS | Textes | Route cible | Statut
```

Ordre recommandé :

1. état initial et sauvegarde ;
2. tokens ;
3. composants de base ;
4. layouts ;
5. pages publiques ;
6. authentification ;
7. dashboard ;
8. pages métier ;
9. états ;
10. données ;
11. responsive ;
12. comparaison ;
13. tests.

Demande uniquement :

> Valides-tu ce plan d’intégration ?

---

# Phase 17 — Intégration fidèle écran par écran

Après validation, commence automatiquement.

Pour chaque écran :

1. ouvre la capture Banani ;
2. ouvre le HTML/CSS Banani ;
3. ouvre les textes et assets ;
4. inventorie les éléments visibles ;
5. implémente un seul écran ;
6. lance l’application ;
7. produit une capture locale à la même largeur ;
8. compare avec la référence ;
9. corrige ;
10. répète jusqu’à validation ;
11. passe au suivant.

## Tolérance zéro sur le contenu

Conserve exactement :

- titres ;
- sous-titres ;
- paragraphes ;
- CTA ;
- labels ;
- navigation ;
- nombres ;
- devises ;
- statuts ;
- ordre des sections.

Interdictions :

- reformuler ;
- raccourcir ;
- améliorer le texte ;
- changer un CTA ;
- supprimer un bloc ;
- inventer une carte ;
- remplacer un mockup ;
- changer l’ordre ;
- utiliser Banani comme simple inspiration.

## Architecture propre

La fidélité n’autorise pas un code sale :

- composants partagés ;
- tokens centralisés ;
- pas de duplication massive ;
- respect de la stack ;
- backend préservé ;
- aucun secret exposé.

---

# Phase 18 — Validation visuelle obligatoire

Pour chaque écran :

1. ouvre la référence ;
2. ouvre la page locale à la même largeur ;
3. prends une capture complète ;
4. compare côte à côte ;
5. consigne les écarts ;
6. corrige ;
7. reprends la capture.

Vérifie :

- textes caractère par caractère ;
- ordre ;
- retours à la ligne ;
- dimensions ;
- marges ;
- paddings ;
- alignements ;
- couleurs ;
- polices ;
- graisses ;
- images ;
- icônes ;
- boutons ;
- rayons ;
- bordures ;
- ombres ;
- responsive ;
- interactions ;
- animations.

Niveaux :

- **Bloquant** : contenu ou structure différent.
- **Majeur** : différence visuelle évidente.
- **Mineur** : finition discrète.

Aucun écran n’est validé avec un écart bloquant ou majeur.

---

# Phase 19 — Tests obligatoires

Exécute ce qui est disponible :

- installation des dépendances ;
- lint ;
- TypeScript ;
- build ;
- tests ;
- navigation ;
- liens ;
- boutons ;
- formulaires ;
- authentification ;
- CSRF ;
- rôles ;
- erreurs API ;
- focus clavier ;
- 320 px ;
- largeur mobile Banani ;
- 768 px ;
- 1440 px ;
- absence de débordement ;
- images ;
- console ;
- contraste ;
- `prefers-reduced-motion`.

Ne déclare jamais le travail terminé si le build échoue.

---

# Phase 20 — Rapport final

Crée :

```text
docs/banani-integration-report.md
```

Il doit contenir :

- classification du projet ;
- projet Banani ;
- méthode MCP ou HTML/CSS ;
- écrans récupérés ;
- écrans intégrés ;
- composants ;
- routes ;
- connexions backend ;
- fichiers importants ;
- tests ;
- écarts ;
- décisions ;
- synchronisation future.

N’inclus aucun token ou secret.

Affiche :

```text
Projet Banani :
Méthode :
Écrans récupérés :
Écrans intégrés :
Stack :
Backend préservé :
DESIGN.md :
MCP :
Tests :
Écarts :
Prochaine action :
```

---

# Synchronisation future

Lorsqu’un écran change dans Banani :

1. récupère le nouvel écran via MCP ;
2. si MCP indisponible, demande le nouvel HTML/CSS et l’image ;
3. compare avec les références précédentes ;
4. modifie uniquement les composants concernés ;
5. conserve les fonctions et données ;
6. actualise `DESIGN.md` uniquement si les tokens changent ;
7. relance les tests ;
8. résume les changements.

Ne remplace jamais tout le frontend pour une petite modification.

---

# Première réponse après activation explicite

Après une demande explicite d'intégration Banani, réponds :

> Je vais piloter automatiquement le workflow Banani pour ce projet. Je commence par identifier le type de projet, vérifier Codex CLI, les MCP disponibles et les références locales. Je n’inventerai aucune clé ni configuration Banani, et je ne te demanderai d’intervenir que lorsqu’une action humaine est indispensable.

Puis commence immédiatement l’inspection.
