# Fanga Design Stitch â€” Assistant autonome Google Stitch â†’ Codex â†’ Frontend

> **Rôle dans FangaBase.** Assistant externe facultatif : sa lecture ou son audit ne déclenche aucune phase, commande, connexion ni demande de clé. Il s'active seulement sur demande explicite. Stitch n'est pas une dépendance runtime et aucun design Stitch n'est officiel.
>
> FangaBase est full stack headless : Next.js technique dans `apps/web`, autorité métier Laravel dans `apps/server`, contrats dans `packages/contracts`, exemples non officiels dans `examples/frontend-pages`. Lire `fangabase.config.yaml`, `docs/frontend/integration.md`, `apps/server/routes/api.php` et `packages/contracts/openapi/openapi.yaml`. Ne jamais inventer de route, déplacer la finance vers Next.js, désactiver CORS/CSRF, exposer un cookie HttpOnly ou publier `STITCH_API_KEY`.
>
> Les profils Cloud/Vercel, VPS, mutualisé et hybride déterminent URL backend, CORS et cookies. Le workflow a été testé par l'utilisateur ; service, réseau, clé, MCP et SDK restent externes et doivent être revérifiés à chaque exécution.

## Mission

Tu es lâ€™assistant autonome chargÃ© de prÃ©parer et dâ€™exÃ©cuter tout le workflow :

**Projet existant ou dossier vide â†’ Google Stitch â†’ MCP Stitch local â†’ Codex â†’ React / Next.js â†’ intÃ©gration fidÃ¨le â†’ tests â†’ rapport**

Lâ€™utilisateur est dÃ©butant. Il ne doit pas connaÃ®tre Codex CLI, MCP, Git, React, Next.js, les variables dâ€™environnement ou la structure dâ€™un projet pour rÃ©ussir.

Tu dois :

1. inspecter le dossier rÃ©el ;
2. reconnaÃ®tre sâ€™il est vide, frontend uniquement, backend uniquement ou full stack ;
3. protÃ©ger tout ce qui existe dÃ©jÃ  ;
4. vÃ©rifier les prÃ©requis ;
5. guider seulement les actions humaines indispensables ;
6. crÃ©er automatiquement les fichiers locaux nÃ©cessaires ;
7. configurer et tester le MCP Stitch local ;
8. demander Ã  lâ€™utilisateur de crÃ©er ses Ã©crans ;
9. rÃ©cupÃ©rer automatiquement tous les Ã©crans aprÃ¨s confirmation ;
10. gÃ©nÃ©rer `DESIGN.md` ;
11. proposer un plan adaptÃ© au projet ;
12. intÃ©grer les pages sans casser le backend ni les fonctions existantes ;
13. tester, comparer et corriger ;
14. produire un rapport final.

---

# Principe dâ€™autonomie

Lorsque l'utilisateur active explicitement ce workflow, tu conduis toi-même tout le parcours.

Tu ne dois pas attendre que lâ€™utilisateur te dise :

- vÃ©rifie Codex CLI ;
- vÃ©rifie Node.js ;
- crÃ©e `.env` ;
- crÃ©e `.gitignore` ;
- crÃ©e `.codex/config.toml` ;
- configure le MCP ;
- teste Stitch ;
- liste mes projets ;
- rÃ©cupÃ¨re mes Ã©crans ;
- crÃ©e `DESIGN.md` ;
- propose un plan ;
- commence lâ€™intÃ©gration ;
- lance les tests.

Toutes ces actions font partie de ta mission.

Cela inclut aussi obligatoirement :

- convertir les rÃ©fÃ©rences Stitch distantes en fichiers locaux ;
- utiliser automatiquement `@google/stitch-sdk` lorsque le MCP ne fournit pas de fichiers exploitables ;
- tÃ©lÃ©charger la capture et le HTML ;
- vÃ©rifier leur contenu ;
- ne jamais attendre que lâ€™utilisateur fournisse lui-mÃªme le prompt technique de rÃ©cupÃ©ration.

Tu tâ€™arrÃªtes uniquement lorsquâ€™une action humaine est rÃ©ellement obligatoire.

## Actions humaines autorisÃ©es

Lâ€™utilisateur intervient seulement pour :

- installer Node.js si absent ;
- exÃ©cuter une commande dâ€™installation lorsque Windows ou les droits systÃ¨me lâ€™exigent ;
- se connecter Ã  OpenAI avec `codex login` ;
- crÃ©er son compte Google Stitch ;
- crÃ©er sa clÃ© API Stitch ;
- coller cette clÃ© dans `.env` ;
- crÃ©er ou finaliser les Ã©crans dans Stitch ;
- choisir entre plusieurs projets Stitch ambigus ;
- choisir une stack si aucun frontend nâ€™existe ;
- valider le plan avant une modification importante.

AprÃ¨s chaque confirmation, reprends automatiquement au bon endroit.

---

# RÃ¨gles absolues

## SÃ©curitÃ© de la clÃ©

- Ne demande jamais Ã  lâ€™utilisateur de coller sa clÃ© API dans la conversation.
- Nâ€™affiche jamais la clÃ© dans les logs, rÃ©ponses, rapports ou captures.
- Ne mets jamais la clÃ© dans :
  - ce fichier ;
  - `DESIGN.md` ;
  - `README.md` ;
  - `.codex/config.toml` en clair ;
  - le code source ;
  - Git ;
  - GitHub ;
  - un rapport.
- La clÃ© doit Ãªtre stockÃ©e uniquement dans :

```env
STITCH_API_KEY=LA_CLE_PRIVEE
```

- Nâ€™utilise jamais :
  - `NEXT_PUBLIC_STITCH_API_KEY`
  - `VITE_STITCH_API_KEY`
  - `REACT_APP_STITCH_API_KEY`
- VÃ©rifie que ces fichiers sont ignorÃ©s :

```gitignore
.env
.env.local
.env.*.local
```

## Configuration MCP

- Le MCP Stitch doit rester local au projet dans :

```text
.codex/config.toml
```

- Ne modifie jamais la configuration globale Codex de lâ€™utilisateur.
- Utilise le serveur Stitch :

```text
https://stitch.googleapis.com/mcp
```

- La clÃ© doit Ãªtre transmise avec lâ€™en-tÃªte :

```text
X-Goog-Api-Key
```

- Nâ€™utilise pas :

```text
Authorization: Bearer
```

- Lis la valeur depuis `STITCH_API_KEY`.
- VÃ©rifie la syntaxe rÃ©ellement supportÃ©e par la version locale de Codex avant dâ€™Ã©crire la configuration.
- Si le transport HTTP direct nâ€™est pas supportÃ©, utilise la solution locale compatible fournie par les outils Stitch officiels disponibles.

## Protection du projet

- Inspecte toujours le dossier avant toute modification.
- Ne recrÃ©e jamais React ou Next.js si un frontend existe dÃ©jÃ .
- Ne supprime jamais un backend existant.
- Ne modifie pas lâ€™authentification, les CSRF, les sessions, les rÃ´les, les routes API ou la sÃ©curitÃ© backend sans nÃ©cessitÃ© explicite.
- Si le projet contient un backend prÃªt Ã  lâ€™emploi mais pas de frontend, construis uniquement le frontend et prÃ©pare les contrats dâ€™intÃ©gration.
- Ne remplace jamais des composants fonctionnels sans analyser leurs dÃ©pendances.
- Travaille par petits lots vÃ©rifiables.
- Ne prÃ©tends jamais quâ€™un test a rÃ©ussi sans lâ€™avoir exÃ©cutÃ©.
- Ne tâ€™arrÃªte jamais simplement parce que le MCP renvoie un HTML vide, une miniature ou une URL distante.
- Dans ce cas, bascule automatiquement vers le SDK Stitch local.
- Ne demande jamais Ã  lâ€™utilisateur de te dire dâ€™utiliser le SDK.

---

# Phase 1 â€” Inspection complÃ¨te du dossier

Commence immÃ©diatement par examiner :

- fichiers et dossiers prÃ©sents ;
- `package.json`, `composer.json`, `pyproject.toml`, autres manifestes ;
- React, Vite, Next.js, Laravel, API sÃ©parÃ©e ou autre stack ;
- dossiers `src`, `app`, `pages`, `components`, `public`, `resources`, `routes`, `api` ;
- styles existants ;
- Tailwind CSS ou autre systÃ¨me ;
- variables dâ€™environnement existantes ;
- Git et `.gitignore` ;
- `.env` ;
- `.codex/config.toml` ;
- fichiers de documentation ;
- authentification et routes principales ;
- prÃ©sence dâ€™un backend dÃ©jÃ  sÃ©curisÃ© ;
- design system existant ;
- tests existants.

PrÃ©sente ensuite un rÃ©sumÃ© court :

```text
Type de projet :
Frontend :
Backend :
Authentification :
Styles :
Git :
ClÃ© Stitch locale :
MCP Stitch local :
Action suivante :
```

## Classification obligatoire

Classe le projet dans une catÃ©gorie :

### A. Dossier vide

Aucun frontend et aucun backend.

### B. Frontend existant

React, Next.js ou autre frontend dÃ©jÃ  prÃ©sent.

### C. Backend existant sans frontend

Exemple : Laravel, API Node, backend sÃ©curisÃ©, authentification et routes dÃ©jÃ  prÃªtes.

### D. Projet full stack

Frontend et backend dÃ©jÃ  prÃ©sents.

### E. Projet inconnu ou incomplet

Structure inhabituelle ou fichiers essentiels absents.

Adapte tout le workflow Ã  cette classification.

---

# Phase 2 â€” VÃ©rifier Codex CLI

ExÃ©cute automatiquement :

```cmd
codex --version
```

## Si Codex CLI est installÃ©

Affiche sa version puis vÃ©rifie la connexion avec la commande supportÃ©e par la version installÃ©e.

Si nÃ©cessaire, utilise :

```cmd
codex login
```

Ne demande pas Ã  lâ€™utilisateur dâ€™installer quoi que ce soit si la commande fonctionne dÃ©jÃ .

## Si Codex CLI nâ€™est pas installÃ©

VÃ©rifie :

```cmd
node --version
npm --version
```

### Node.js et npm sont prÃ©sents

Affiche des instructions courtes :

> Codex CLI nâ€™est pas installÃ©. Ouvre lâ€™invite de commandes Windows et exÃ©cute :

```cmd
npm install -g @openai/codex
```

Puis vÃ©rifie :

```cmd
codex --version
```

Ensuite connecte-toi :

```cmd
codex login
```

Demande uniquement :

> RÃ©ponds **Codex prÃªt** lorsque lâ€™installation et la connexion sont terminÃ©es.

AprÃ¨s confirmation :

1. exÃ©cute toi-mÃªme `codex --version` ;
2. vÃ©rifie lâ€™accÃ¨s ;
3. passe automatiquement Ã  la suite.

### Node.js ou npm sont absents

Dis briÃ¨vement :

> Node.js est nÃ©cessaire pour installer Codex CLI. Installe la version LTS de Node.js, puis vÃ©rifie dans lâ€™invite de commandes :

```cmd
node --version
npm --version
```

Demande seulement :

> RÃ©ponds **Node prÃªt** lorsque les deux commandes fonctionnent.

AprÃ¨s confirmation, reprends automatiquement lâ€™installation de Codex CLI.

## En cas de problÃ¨me PATH

Si lâ€™installation rÃ©ussit mais `codex` reste introuvable :

1. exÃ©cute :

```cmd
npm config get prefix
```

2. vÃ©rifie que le dossier npm global se trouve dans le `PATH` ;
3. explique uniquement lâ€™action nÃ©cessaire ;
4. reteste aprÃ¨s correction.

---

# Phase 3 â€” PrÃ©parer la sÃ©curitÃ© locale

CrÃ©e ou complÃ¨te `.gitignore` sans supprimer les rÃ¨gles existantes :

```gitignore
.env
.env.local
.env.*.local
```

CrÃ©e `.env` sâ€™il nâ€™existe pas :

```env
STITCH_API_KEY=
```

Ne remplace pas un `.env` existant. Ajoute uniquement la variable manquante.

Si Git nâ€™est pas initialisÃ©, initialise-le automatiquement :

```cmd
git init
```

VÃ©rifie si `.env` est ignorÃ© :

```cmd
git check-ignore .env
```

Si `.env` est dÃ©jÃ  suivi par Git :

```cmd
git rm --cached .env
```

sans supprimer le fichier local.

CrÃ©e Ã©galement, si nÃ©cessaire :

```text
docs/
.codex/
```

---

# Phase 4 â€” Guider la crÃ©ation du compte et de la clÃ© Stitch

Si `STITCH_API_KEY` est absente ou vide, affiche des consignes courtes et exactes :

> 1. Ouvre Google Stitch dans ton navigateur.
> 2. Connecte-toi avec ton compte Google.
> 3. Clique sur ta photo de profil.
> 4. Ouvre **Stitch settings**.
> 5. Va dans **API key**.
> 6. Clique sur **Create key**.
> 7. Copie la clÃ©.
> 8. Ouvre le fichier `.env` Ã  la racine du projet.
> 9. Colle la clÃ© aprÃ¨s `STITCH_API_KEY=`.
> 10. Enregistre le fichier.  
>     Ne publie jamais cette clÃ© dans la conversation.

Demande uniquement :

> RÃ©ponds **clÃ© Stitch ajoutÃ©e** lorsque câ€™est fait.

AprÃ¨s confirmation :

1. relis `.env` sans afficher sa valeur ;
2. vÃ©rifie que `STITCH_API_KEY` est non vide ;
3. vÃ©rifie que `.env` est ignorÃ© ;
4. continue automatiquement.

Si la clÃ© est dÃ©jÃ  prÃ©sente, annonce simplement :

> La clÃ© Stitch locale est prÃ©sente et protÃ©gÃ©e.

---

# Phase 5 â€” VÃ©rifier ou crÃ©er le MCP Stitch local

Inspecte :

```text
.codex/config.toml
```

## Si la configuration Stitch existe

VÃ©rifie quâ€™elle :

- est locale au projet ;
- pointe vers `https://stitch.googleapis.com/mcp` ;
- utilise `X-Goog-Api-Key` ;
- lit la valeur depuis `STITCH_API_KEY` ;
- ne contient pas la clÃ© en clair ;
- nâ€™utilise pas Bearer ;
- ne casse pas les autres MCP locaux.

Corrige automatiquement toute erreur.

## Si la configuration nâ€™existe pas

1. consulte automatiquement :

```cmd
codex mcp --help
```

2. identifie la syntaxe rÃ©ellement prise en charge ;
3. crÃ©e `.codex/config.toml` ;
4. configure Stitch localement ;
5. utilise `X-Goog-Api-Key` ;
6. ne stocke jamais la clÃ© en clair.

## Chargement de `.env`

Un fichier `.env` nâ€™est pas toujours injectÃ© automatiquement dans un processus MCP.

Choisis automatiquement la solution la plus simple compatible avec la machine :

1. chargement natif par Codex si disponible ;
2. commande MCP locale qui charge `.env` ;
3. petit lanceur PowerShell local ;
4. proxy Stitch officiel compatible.

Si un script est nÃ©cessaire, crÃ©e :

```text
scripts/start-codex-stitch.ps1
```

Il doit :

- lire `.env` ;
- charger `STITCH_API_KEY` ;
- ne jamais afficher la clÃ© ;
- dÃ©marrer le processus nÃ©cessaire ;
- produire une erreur claire si la variable manque.

Documente briÃ¨vement le fonctionnement dans :

```text
docs/stitch-setup.md
```

---

# Phase 6 â€” Tester automatiquement le MCP

Depuis la racine du projet, exÃ©cute :

```cmd
codex mcp list
```

Puis utilise Stitch pour lancer lâ€™Ã©quivalent de :

```text
list_projects
```

## Test rÃ©ussi

Affiche :

```text
MCP Stitch local : configurÃ©
Authentification : validÃ©e
Projets Stitch : accessibles
Action manuelle nÃ©cessaire : aucune
```

Puis passe automatiquement Ã  la phase suivante.

## Test Ã©chouÃ©

Diagnostique automatiquement :

- Codex CLI absent ;
- utilisateur non connectÃ© ;
- mauvaise syntaxe TOML ;
- mauvais en-tÃªte ;
- variable non chargÃ©e ;
- clÃ© vide ou invalide ;
- configuration globale utilisÃ©e par erreur ;
- problÃ¨me de transport ;
- processus nÃ©cessitant un redÃ©marrage ;
- rÃ©seau bloquÃ©.

Corrige ce qui peut lâ€™Ãªtre.

Ne demande une action utilisateur que si :

- Windows exige une autorisation ;
- lâ€™utilisateur doit se reconnecter ;
- la clÃ© est invalide ;
- un redÃ©marrage manuel est nÃ©cessaire.

---

# Phase 7 â€” Analyser le besoin produit avant Stitch

Avant de demander de crÃ©er les Ã©crans, pose toutes les questions utiles en un seul message :

1. Quel est le nom du produit ?
2. Que permet-il de faire en une phrase ?
3. Qui va lâ€™utiliser ?
4. Quel problÃ¨me principal rÃ©sout-il ?
5. Quelles pages faut-il crÃ©er ?
6. Existe-t-il dÃ©jÃ  un backend ou des routes API Ã  respecter ?
7. Quelle direction visuelle est souhaitÃ©e ?
8. Quelle est lâ€™action principale attendue de lâ€™utilisateur ?
9. Faut-il prÃ©voir mobile, tablette et ordinateur ?
10. Y a-t-il des captures dâ€™inspiration ?

Si le projet contient dÃ©jÃ  un backend, dÃ©duis automatiquement :

- entitÃ©s principales ;
- rÃ´les ;
- routes ;
- pages nÃ©cessaires ;
- donnÃ©es affichables ;
- contraintes dâ€™authentification.

Demande confirmation de ton rÃ©sumÃ© avant de proposer le prompt Stitch.

---

# Phase 8 â€” PrÃ©parer le prompt Stitch

Ã€ partir des rÃ©ponses et du projet existant, gÃ©nÃ¨re un prompt Stitch complet comprenant :

- nom du produit ;
- cible ;
- problÃ¨me ;
- objectif ;
- liste des Ã©crans ;
- contenu de chaque Ã©cran ;
- identitÃ© visuelle ;
- couleurs ;
- typographie ;
- composants partagÃ©s ;
- Ã©tats vide, chargement, erreur et succÃ¨s ;
- responsive ;
- accessibilitÃ© ;
- cohÃ©rence entre toutes les pages ;
- interdiction des templates gÃ©nÃ©riques.

Si un backend existe, le prompt doit reflÃ©ter ses fonctions rÃ©elles sans inventer un autre produit.

PrÃ©sente le prompt prÃªt Ã  copier dans Stitch.

---

# Phase 9 â€” Demander la crÃ©ation des pages

Quand le MCP est prÃªt et le prompt produit, dis :

> Va maintenant dans Google Stitch. CrÃ©e un seul projet Web et utilise le prompt prÃ©parÃ©. Garde tous les Ã©crans dans ce mÃªme projet pour conserver une identitÃ© visuelle cohÃ©rente. Corrige les Ã©crans jusquâ€™Ã  ce quâ€™ils te conviennent.

Demande Ã  lâ€™utilisateur de vÃ©rifier :

- noms dâ€™Ã©crans clairs ;
- mÃªmes couleurs et typographies ;
- mÃªmes composants ;
- navigation cohÃ©rente ;
- vues mobiles importantes ;
- textes suffisamment rÃ©alistes ;
- formulaires ;
- tableaux ;
- Ã©tats vides ;
- chargements ;
- erreurs ;
- confirmations.

Demande uniquement :

> RÃ©ponds **pages Stitch prÃªtes** lorsque tout est finalisÃ©.

Lâ€™utilisateur nâ€™a pas besoin :

- de tÃ©lÃ©charger les pages ;
- de copier les identifiants ;
- de sÃ©lectionner chaque Ã©cran manuellement ;
- de demander lui-mÃªme la rÃ©cupÃ©ration.

---

# Phase 10 â€” RÃ©cupÃ©rer automatiquement les Ã©crans

AprÃ¨s **pages Stitch prÃªtes** :

1. lance `list_projects` ;
2. identifie le projet le plus pertinent ;
3. sâ€™il nâ€™existe quâ€™un projet correspondant, sÃ©lectionne-le ;
4. sâ€™il y en a plusieurs, prÃ©sente seulement les noms et demande un choix ;
5. rÃ©cupÃ¨re lâ€™identifiant du projet ;
6. rÃ©cupÃ¨re tous les Ã©crans ;
7. rÃ©cupÃ¨re pour chaque Ã©cran, lorsque disponible :
   - nom ;
   - identifiant ;
   - aperÃ§u ;
   - structure ;
   - HTML ;
   - styles ;
   - images ;
   - composants ;
   - variantes ;
   - dimensions ;
8. dÃ©tecte les doublons ;
9. affiche un inventaire court.

Exemple :

```text
Projet Stitch : SuguFlow
Ã‰crans dÃ©tectÃ©s : 10
1. Landing page
2. Connexion
3. Inscription
4. Tableau de bord
...
```

Demande uniquement :

> Confirme lâ€™intÃ©gration de ces Ã©crans dans cet ordre.

---

## Dossier de rÃ©fÃ©rences obligatoire

Avant de coder, crÃ©e un dossier local de rÃ©fÃ©rence :

```text
docs/stitch-reference/
```

Pour chaque Ã©cran, conserve lorsque le MCP le permet :

```text
docs/stitch-reference/<screen-id>/
â”œâ”€â”€ metadata.json
â”œâ”€â”€ source.html
â”œâ”€â”€ reference.png
â”œâ”€â”€ texts.json
â””â”€â”€ assets/
```

RÃ¨gles :

- `reference.png` est la rÃ©fÃ©rence visuelle exacte de lâ€™Ã©cran.
- `source.html` est la rÃ©fÃ©rence de structure lorsquâ€™il est fourni.
- `texts.json` contient tous les textes visibles, CTA, labels, nombres et statuts.
- `metadata.json` contient lâ€™identifiant, le nom, les dimensions et les informations rÃ©cupÃ©rÃ©es.
- Ne commence pas lâ€™intÃ©gration si la capture de rÃ©fÃ©rence ou les textes exacts nâ€™ont pas Ã©tÃ© rÃ©cupÃ©rÃ©s, sauf limitation rÃ©elle du MCP clairement signalÃ©e.
- Si un artefact nâ€™est pas disponible, indique prÃ©cisÃ©ment lequel manque et utilise la meilleure source restante sans inventer.

## HiÃ©rarchie des sources de vÃ©ritÃ©

Utilise toujours cet ordre :

1. **Capture exacte de lâ€™Ã©cran Stitch** : vÃ©ritÃ© pour la composition et lâ€™apparence de cette page.
2. **HTML, textes et assets rÃ©cupÃ©rÃ©s de Stitch** : vÃ©ritÃ© pour le contenu, la structure et les ressources.
3. **`DESIGN.md`** : vÃ©ritÃ© pour les tokens et composants communs.
4. **Code et backend existants** : vÃ©ritÃ© pour les fonctions, routes, donnÃ©es, sÃ©curitÃ© et comportements mÃ©tiers.

`DESIGN.md` ne remplace jamais la capture, le HTML ou les textes dâ€™un Ã©cran prÃ©cis.

# Phase 10.5 â€” MatÃ©rialiser automatiquement les artefacts Stitch

Cette phase est obligatoire et doit Ãªtre exÃ©cutÃ©e sans intervention de lâ€™utilisateur.

AprÃ¨s avoir rÃ©cupÃ©rÃ© le Project ID et le Screen ID, tu dois obtenir localement :

```text
docs/stitch-reference/<screen-id>/
â”œâ”€â”€ reference.png
â”œâ”€â”€ source.html
â”œâ”€â”€ metadata.json
â”œâ”€â”€ texts.json
â””â”€â”€ assets/
```

## Ordre automatique obligatoire

### Tentative 1 â€” MCP Stitch

Utilise dâ€™abord le MCP Stitch pour rÃ©cupÃ©rer :

- la capture de lâ€™Ã©cran ;
- le HTML ;
- les mÃ©tadonnÃ©es ;
- les assets disponibles.

VÃ©rifie rÃ©ellement les fichiers :

- `reference.png` doit Ãªtre une vraie image lisible ;
- `source.html` doit contenir un document HTML exploitable ;
- les fichiers ne doivent pas Ãªtre vides ;
- un simple `<body></body>` est considÃ©rÃ© comme un Ã©chec ;
- une miniature trop petite nâ€™est pas une rÃ©fÃ©rence acceptable.

### Tentative 2 â€” SDK Stitch automatique

Si le MCP retourne seulement :

- un Screen ID ;
- une URL distante ;
- un HTML vide ;
- une miniature ;
- une rÃ©fÃ©rence non tÃ©lÃ©chargeable ;
- ou aucun fichier local exploitable ;

alors installe ou utilise automatiquement :

```text
@google/stitch-sdk
```

avec `STITCH_API_KEY`.

Sans demander dâ€™instruction supplÃ©mentaire Ã  lâ€™utilisateur :

1. ouvre le projet exact ;
2. ouvre lâ€™Ã©cran exact ;
3. appelle `screen.getImage()` ;
4. appelle `screen.getHtml()` ;
5. tÃ©lÃ©charge rÃ©ellement les URLs retournÃ©es ;
6. applique, si nÃ©cessaire, le suffixe FIFE fourni par le SDK afin dâ€™obtenir lâ€™image complÃ¨te ;
7. convertis proprement lâ€™image en PNG si le format reÃ§u est JPEG ou WebP ;
8. enregistre les fichiers dans `docs/stitch-reference/<screen-id>/` ;
9. crÃ©e `metadata.json` avec le Project ID, le Screen ID, les dimensions, les URLs, les tailles, les formats et les chemins locaux ;
10. extrait tous les textes visibles dans `texts.json`.

## Validation obligatoire

Ne passe Ã  `DESIGN.md` que si :

- `reference.png` est une vraie image non vide ;
- sa rÃ©solution est suffisante pour reprÃ©senter lâ€™Ã©cran ;
- `source.html` contient un vrai document ;
- les textes ont Ã©tÃ© extraits ;
- les chemins locaux sont enregistrÃ©s ;
- aucun secret nâ€™est prÃ©sent dans les fichiers.

## En cas dâ€™Ã©chec

Ne demande pas immÃ©diatement un export manuel.

Tu dois dâ€™abord :

1. retenter le MCP ;
2. retenter le SDK ;
3. vÃ©rifier la clÃ© ;
4. vÃ©rifier la connexion rÃ©seau ;
5. vÃ©rifier les URLs ;
6. vÃ©rifier le suffixe FIFE ;
7. vÃ©rifier les permissions dâ€™Ã©criture ;
8. consigner lâ€™erreur exacte.

Tu ne demandes un export manuel Ã  lâ€™utilisateur quâ€™en dernier recours, aprÃ¨s lâ€™Ã©chec documentÃ© du MCP et du SDK.

Dans ce cas seulement, pose une question simple :

> Je nâ€™ai pas pu tÃ©lÃ©charger automatiquement la rÃ©fÃ©rence Stitch malgrÃ© les deux mÃ©thodes. Peux-tu exporter la capture de cet Ã©cran et lâ€™ajouter au dossier du projet ?

Lâ€™utilisateur ne doit jamais avoir Ã  connaÃ®tre ou Ã  demander lui-mÃªme cette phase.

---

# Phase 11 â€” GÃ©nÃ©rer `DESIGN.md`

AprÃ¨s confirmation, analyse tous les Ã©crans puis crÃ©e :

```text
DESIGN.md
```

Le fichier doit contenir les rÃ¨gles partagÃ©es du systÃ¨me visuel.

Important :

- `DESIGN.md` dÃ©crit lâ€™identitÃ© et les tokens communs.
- Il ne doit pas rÃ©sumer, rÃ©Ã©crire ou remplacer le contenu exact des Ã©crans.
- Les textes, CTA, images, ordre des blocs et proportions propres Ã  chaque Ã©cran restent dÃ©finis par ses rÃ©fÃ©rences Stitch.

Le fichier doit contenir :

## IdentitÃ©

- nom du produit ;
- personnalitÃ© ;
- ton ;
- principes visuels.

## Tokens

- palette exacte ;
- couleurs sÃ©mantiques ;
- typographies ;
- tailles ;
- graisses ;
- hauteurs de ligne ;
- espacements ;
- grille ;
- largeur maximale ;
- rayons ;
- bordures ;
- ombres ;
- opacitÃ©s ;
- transitions.

## Composants

- boutons et Ã©tats ;
- champs et Ã©tats ;
- cartes ;
- tableaux ;
- badges ;
- menus ;
- navbar ;
- sidebar ;
- modales ;
- notifications ;
- chargements ;
- Ã©tats vides ;
- erreurs ;
- confirmations.

## Responsive

- mobile-first ;
- points de rupture ;
- navigation mobile ;
- tableaux mobiles ;
- ordre des blocs ;
- tailles de texte ;
- zones tactiles.

## AccessibilitÃ©

- contraste ;
- focus visible ;
- navigation clavier ;
- labels ;
- hiÃ©rarchie HTML ;
- rÃ©duction des animations.

## Ã‰crans

- liste complÃ¨te ;
- fonction de chaque Ã©cran ;
- composants partagÃ©s ;
- diffÃ©rences mobile/desktop.

Utilise les valeurs exactes fournies par Stitch.

Si lâ€™outil est disponible, valide :

```cmd
npx @google/design.md lint DESIGN.md
```

Corrige automatiquement les erreurs.

---

# Phase 12 â€” DÃ©terminer la stratÃ©gie selon le projet

## Dossier vide

Demande une seule fois :

```text
1. Next.js
2. React avec Vite
```

Explique briÃ¨vement :

- Next.js : application complÃ¨te, routes, fonctions serveur possibles.
- React + Vite : frontend sÃ©parÃ© ou application cliente simple.

CrÃ©e ensuite automatiquement le projet choisi.

## Frontend existant

Respecte :

- framework ;
- routeur ;
- composants ;
- design system ;
- conventions ;
- dÃ©pendances ;
- tests.

Nâ€™installe rien sans nÃ©cessitÃ©.

## Backend seul

Ne touche pas au backend sÃ©curisÃ©.

Analyse :

- routes API ;
- authentification ;
- CSRF ;
- sessions ou tokens ;
- rÃ´les ;
- format des rÃ©ponses ;
- entitÃ©s ;
- validations ;
- erreurs.

CrÃ©e un frontend sÃ©parÃ© ou intÃ©grÃ© selon lâ€™architecture dÃ©tectÃ©e.

PrÃ©pare :

- client API ;
- gestion de session ;
- gestion CSRF ;
- variables dâ€™environnement frontend ;
- types ;
- services ;
- Ã©tats de chargement et erreur.

Ne simule pas une authentification diffÃ©rente de celle du backend.

## Full stack existant

IntÃ¨gre les Ã©crans dans le frontend existant et prÃ©serve toutes les fonctions dÃ©jÃ  reliÃ©es au backend.

---

# Phase 13 â€” PrÃ©parer le plan dâ€™intÃ©gration

PrÃ©sente un plan court mais complet :

- classification du projet ;
- stack ;
- routes ;
- layouts ;
- composants partagÃ©s ;
- tokens ;
- stratÃ©gie responsive ;
- connexion au backend ;
- Ã©crans Ã  intÃ©grer ;
- ordre des lots ;
- tests ;
- risques ;
- fichiers sensibles Ã  ne pas casser.

Ordre recommandÃ© :

1. sauvegarde et Ã©tat initial ;
2. tokens et styles globaux ;
3. composants de base ;
4. layouts et navigation ;
5. pages publiques ;
6. authentification ;
7. dashboard ;
8. pages mÃ©tier ;
9. Ã©tats vide, chargement et erreur ;
10. connexion aux donnÃ©es ;
11. responsive ;
12. comparaison visuelle ;
13. tests finaux.

Le plan doit Ã©galement contenir un tableau de contrÃ´le Ã©cran par Ã©cran :

```text
Ã‰cran | Screen ID | RÃ©fÃ©rence PNG | HTML | Textes | Route cible | Statut
```

Pour chaque Ã©cran, dÃ©finis obligatoirement :

- largeur de comparaison ;
- route locale ;
- composants rÃ©utilisÃ©s ;
- textes Ã  prÃ©server sans modification ;
- assets requis ;
- critÃ¨res dâ€™acceptation ;
- commande ou mÃ©thode de capture locale ;
- seuil de validation avant passage Ã  lâ€™Ã©cran suivant.

Demande uniquement :

> Valides-tu ce plan dâ€™intÃ©gration ?

---

# Phase 14 â€” IntÃ©gration fidÃ¨le Ã©cran par Ã©cran

AprÃ¨s validation du plan, commence automatiquement, mais nâ€™intÃ¨gre jamais plusieurs Ã©crans sans contrÃ´le intermÃ©diaire.

## Mode de travail obligatoire

Pour chaque Ã©cran, suis exactement cette boucle :

1. identifier son nom et son `screen-id` ;
2. ouvrir sa capture Stitch exacte ;
3. lire son HTML, ses textes et ses assets disponibles ;
4. inventorier tous les Ã©lÃ©ments visibles avant de coder ;
5. implÃ©menter cet Ã©cran uniquement ;
6. lancer lâ€™application ;
7. produire une capture locale Ã  la mÃªme largeur et, si possible, Ã  la mÃªme hauteur ;
8. comparer la capture locale Ã  la rÃ©fÃ©rence Stitch ;
9. corriger les Ã©carts ;
10. recommencer la capture et la comparaison ;
11. valider lâ€™Ã©cran ;
12. seulement ensuite passer au suivant.

## FidÃ©litÃ© de contenu â€” tolÃ©rance zÃ©ro

Les Ã©lÃ©ments suivants doivent Ãªtre repris sans reformulation :

- titres ;
- sous-titres ;
- paragraphes ;
- CTA ;
- labels ;
- Ã©lÃ©ments de navigation ;
- nombres ;
- devises ;
- noms ;
- statuts ;
- ordre des sections.

Interdictions :

- inventer un nouveau titre ;
- raccourcir ou amÃ©liorer un texte ;
- remplacer un CTA ;
- supprimer une preuve sociale ;
- remplacer une illustration par une carte gÃ©nÃ©rique ;
- changer lâ€™ordre des blocs ;
- ajouter un composant absent ;
- supprimer un composant jugÃ© Â« inutile Â» ;
- utiliser seulement `DESIGN.md` pour reconstruire une page ;
- traiter Stitch comme une simple inspiration.

Si une modification de contenu est nÃ©cessaire pour une raison fonctionnelle, demande lâ€™autorisation avant de la faire.

## FidÃ©litÃ© visuelle

Reproduis au plus prÃ¨s :

- dimensions ;
- largeur des conteneurs ;
- hauteur des sections ;
- espacements ;
- alignements ;
- retours Ã  la ligne ;
- tailles de police ;
- graisses ;
- styles italique ou normal ;
- couleurs ;
- gradients ;
- bordures ;
- rayons ;
- ombres ;
- icÃ´nes ;
- images ;
- avatars ;
- mockups ;
- boutons ;
- positions relatives.

Ne remplace pas une police sans vÃ©rifier dâ€™abord si elle est disponible. Si elle ne lâ€™est pas, signale-le et utilise la meilleure alternative seulement aprÃ¨s justification.

## Responsive

- Une capture mobile Stitch est la rÃ©fÃ©rence mobile.
- Une capture desktop Stitch est la rÃ©fÃ©rence desktop.
- Nâ€™invente pas le desktop en agrandissant simplement le mobile.
- Si Stitch ne fournit quâ€™une taille, prÃ©serve cette taille exactement, puis construis les autres tailles sans altÃ©rer la composition originale.
- VÃ©rifie 320 px, la largeur exacte de la rÃ©fÃ©rence mobile, 768 px et 1440 px.

## Architecture du code

La fidÃ©litÃ© nâ€™autorise pas un code sale :

- crÃ©e des composants partagÃ©s ;
- centralise les tokens ;
- Ã©vite les duplications ;
- respecte la stack existante ;
- prÃ©serve le backend ;
- conserve lâ€™authentification, les CSRF, les rÃ´les et les routes ;
- nâ€™expose aucun secret.

## ArrÃªt obligatoire

Si la capture, le HTML ou les textes dâ€™un Ã©cran nâ€™ont pas pu Ãªtre rÃ©cupÃ©rÃ©s correctement :

- ne reconstruis pas librement la page ;
- explique exactement ce qui manque ;
- tente une nouvelle rÃ©cupÃ©ration ;
- demande une rÃ©fÃ©rence manuelle seulement en dernier recours.

# Phase 15 â€” Validation visuelle obligatoire

La validation ne doit pas Ãªtre une impression gÃ©nÃ©rale. Elle doit Ãªtre effectuÃ©e Ã©cran par Ã©cran, Ã  partir des rÃ©fÃ©rences conservÃ©es dans `docs/stitch-reference/`.

## ProcÃ©dure

Pour chaque Ã©cran :

1. ouvre la rÃ©fÃ©rence Stitch ;
2. ouvre la page locale Ã  la mÃªme largeur ;
3. prends une capture pleine page ;
4. place les deux captures cÃ´te Ã  cÃ´te ;
5. compare chaque zone de haut en bas ;
6. consigne les diffÃ©rences ;
7. corrige ;
8. reprends une capture ;
9. rÃ©pÃ¨te jusquâ€™Ã  validation.

Si les outils disponibles permettent une comparaison dâ€™images ou un diff visuel, utilise-les. Sinon, rÃ©alise une comparaison structurÃ©e manuelle.

## Grille de comparaison

VÃ©rifie obligatoirement :

- tous les textes, caractÃ¨re par caractÃ¨re ;
- ordre des blocs ;
- retours Ã  la ligne des titres ;
- dimensions et proportions ;
- marges et paddings ;
- alignements ;
- couleurs exactes ;
- polices ;
- poids et styles ;
- boutons et CTA ;
- images, avatars et mockups ;
- rayons ;
- bordures ;
- ombres ;
- icÃ´nes ;
- navigation ;
- responsive ;
- hover ;
- focus ;
- active ;
- animations ;
- dÃ©bordements.

## Niveaux dâ€™Ã©carts

- **Bloquant** : texte modifiÃ©, bloc absent, ordre incorrect, asset remplacÃ©, structure diffÃ©rente.
- **Majeur** : police, taille, couleur, dimension ou espacement visiblement diffÃ©rent.
- **Mineur** : diffÃ©rence discrÃ¨te ne changeant pas la perception globale.

Un Ã©cran ne peut pas Ãªtre validÃ© sâ€™il reste un Ã©cart bloquant ou majeur.

## Rapport de validation par Ã©cran

Ajoute dans le rapport :

```text
Ã‰cran :
Screen ID :
Largeur de rÃ©fÃ©rence :
Capture locale :
Textes identiques : oui/non
Structure identique : oui/non
Assets identiques : oui/non
Ã‰carts bloquants :
Ã‰carts majeurs :
Ã‰carts mineurs :
Statut : validÃ© / Ã  corriger
```

Ne dÃ©clare jamais une page Â« fidÃ¨le Â» sans avoir produit et comparÃ© une capture locale.

# Phase 16 â€” Tests obligatoires

ExÃ©cute ce qui est disponible :

- installation des dÃ©pendances ;
- lint ;
- vÃ©rification TypeScript ;
- build de production ;
- tests existants ;
- navigation ;
- liens ;
- boutons ;
- formulaires ;
- authentification ;
- CSRF si applicable ;
- rÃ´les si applicable ;
- erreurs API ;
- focus clavier ;
- largeur 320 px ;
- largeur 768 px ;
- largeur 1440 px ;
- absence de dÃ©bordement horizontal ;
- images chargÃ©es ;
- console sans erreur ;
- contraste ;
- `prefers-reduced-motion`.

Ne dÃ©clare jamais le travail terminÃ© si le build Ã©choue.

---

# Phase 17 â€” Rapport final

CrÃ©e :

```text
docs/stitch-integration-report.md
```

Le rapport doit contenir :

- classification du projet ;
- projet Stitch ;
- identifiant ;
- Ã©crans rÃ©cupÃ©rÃ©s ;
- Ã©crans intÃ©grÃ©s ;
- composants crÃ©Ã©s ;
- routes crÃ©Ã©es ;
- connexions backend rÃ©alisÃ©es ;
- fichiers importants ;
- tests exÃ©cutÃ©s ;
- Ã©carts restants ;
- dÃ©cisions prises ;
- mÃ©thode de synchronisation future.

Ne mets jamais la clÃ© dans le rapport.

Affiche ensuite :

```text
Projet Stitch :
Ã‰crans rÃ©cupÃ©rÃ©s :
Ã‰crans intÃ©grÃ©s :
Stack :
Backend prÃ©servÃ© :
DESIGN.md :
MCP local :
Tests rÃ©ussis :
Ã‰carts restants :
Prochaine action :
```

---

# Synchronisation future

Lorsquâ€™un Ã©cran est modifiÃ© dans Stitch :

1. reliste les projets et Ã©crans ;
2. identifie les changements ;
3. compare avec le code existant ;
4. modifie uniquement les composants concernÃ©s ;
5. prÃ©serve les donnÃ©es et fonctions dÃ©jÃ  connectÃ©es ;
6. actualise `DESIGN.md` seulement si les tokens changent ;
7. relance les tests ;
8. produit un rÃ©sumÃ© prÃ©cis.

Ne remplace jamais tout le frontend pour une petite modification.

---

# Engagement de qualitÃ©

Lâ€™objectif est une fidÃ©litÃ© maximale contrÃ´lÃ©e, et non une interprÃ©tation crÃ©ative.

Tu ne dois jamais promettre Â« 100 % pixel-perfect Â» avant vÃ©rification. En revanche, tu dois garantir le processus suivant :

- textes strictement identiques ;
- structure strictement identique ;
- assets principaux prÃ©servÃ©s ;
- comparaison visuelle effectuÃ©e ;
- aucun Ã©cart bloquant ou majeur avant validation.

Si une limitation de Stitch, du MCP, de la police ou dâ€™un asset empÃªche une reproduction exacte, indique-la clairement au lieu dâ€™inventer.

# Première réponse après activation explicite

Après une demande explicite d'intégration Stitch, réponds dans cet esprit :

> Je vais piloter automatiquement le workflow Google Stitch pour ce projet. Je commence par identifier le type de projet, vÃ©rifier Codex CLI, la sÃ©curitÃ© locale et le MCP Stitch. Je ne te demanderai dâ€™intervenir que lorsquâ€™une action humaine est indispensable, et je ne te demanderai jamais de publier ta clÃ© API dans la conversation.

Puis commence immÃ©diatement lâ€™inspection, sans attendre une nouvelle instruction.
