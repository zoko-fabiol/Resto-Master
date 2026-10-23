# Plan de Configuration Initiale RestoMaster OS

> **Statut** : Proposition de conception à valider
> **Périmètre** : Première configuration de l'appareil et du système depuis l'application restaurant
> **Autorité** : Super Admin du restaurant uniquement
> **Référence UX** : assistant de première mise en route plein écran, inspiré de l'OOBE Windows

## 1. Vision

La configuration initiale doit donner l'impression de mettre l'appareil et le restaurant en service, pas de remplir un formulaire administratif. Le Super Admin restaurant avance dans un parcours plein écran, guidé et visuel, inspiré des premières mises en route Windows, Apple et Android, où chaque écran répond à une seule question. Une barre de progression persistante et des transitions animées indiquent ce qui est terminé, ce qui reste à faire et si une étape est bloquante.

La création technique du tenant reste une responsabilité de la plateforme. Elle ne constitue pas la configuration initiale : le parcours ci-dessous commence dans l'application restaurant après la création du compte et se termine par la certification du système et la remise du code restaurant.

À la fin du parcours, le système doit avoir :

- créé le tenant, l'organisation et le point de vente principal ;
- configuré les modules, les règles opérationnelles et les limites du plan ;
- créé le compte du propriétaire du restaurant ;
- généré un code restaurant unique, nécessaire à la connexion du personnel ;
- produit un récapitulatif imprimable et un paquet de remise sécurisé ;
- enregistré chaque décision dans l'audit plateforme ;
- verrouillé la configuration initiale comme terminée.

Le code restaurant n'est pas un mot de passe. Il identifie l'établissement et doit être accompagné d'un identifiant utilisateur et d'un secret d'authentification. Il ne doit jamais être le seul facteur permettant d'ouvrir une session.

## 2. Règles d'accès et de sécurité

### 2.1 Autorisation

| Action | Admin plateforme | Direction restaurant | Super Admin restaurant |
| :--- | :---: | :---: | :---: |
| Créer un tenant | Oui | Non | Non |
| Lancer la configuration initiale | Non | Non | Oui |
| Générer le code restaurant à la certification | Non | Non | Oui |
| Configurer le catalogue et les tables après remise | Non | Oui | Oui |
| Modifier le verrouillage de configuration | Non | Non | Oui |

Le bouton d'entrée dans l'assistant est visible uniquement pour `superadmin`, mais l'autorisation réelle doit être vérifiée par une Cloud Function. Toute tentative client non autorisée doit répondre `permission-denied`. La Direction peut exploiter le restaurant, mais ne peut pas lancer ou certifier la configuration initiale.

### 2.2 Code restaurant

- Génération côté serveur avec `crypto.randomBytes` ou `crypto.randomInt`, jamais dans React.
- Format lisible : `RMS-XXXX-XXXX` en alphabet sans caractères ambigus (`0/O`, `1/I` exclus).
- Unicité garantie par une transaction ou une réservation atomique dans Firestore.
- Conservation du code sous forme de hash pour les vérifications ; la valeur en clair n'est renvoyée qu'à la fin du provisioning et dans un paquet de remise chiffré.
- Jamais de code complet dans les logs, les erreurs, les analytics ou les captures d'écran de test.
- Régénération interdite par défaut : elle exige une action explicite du Super Admin, un motif, une confirmation renforcée et un audit.
- Une régénération invalide l'ancien code après une courte fenêtre de transition documentée.

### 2.3 Idempotence et reprise

L'assistant doit pouvoir être fermé puis repris sans recréer un tenant. Chaque création possède une `setupSessionId` idempotente et un état serveur : `draft`, `in_progress`, `ready_for_handover`, `completed`, `blocked`. Une panne réseau doit reprendre à la dernière étape confirmée.

## 3. Parcours plein écran, section par section

### Écran 0 — Accès sécurisé

**Objectif** : établir que la personne qui lance le provisioning est bien autorisée.

- Écran plein écran avec logo RestoMaster, nom du Super Admin connecté et environnement courant.
- Vérification du rôle plateforme côté serveur.
- Ré-authentification ou MFA step-up avant une création réelle.
- Affichage d'un avertissement : « Cette action crée un établissement et un accès propriétaire. »
- Actions : `Commencer`, `Annuler`.

**Bloquant** : rôle insuffisant, MFA absent, session expirée ou tenant déjà en cours de création.

### Écran 1 — Bienvenue et préparation

**Objectif** : expliquer le parcours en quelques secondes et donner une durée estimée.

- Illustration : restaurant vu de face avec zones Salle, Cuisine, Bar et Livraison.
- 8 à 10 étapes annoncées, sans jargon technique.
- Indication « Vous pourrez reprendre plus tard ».
- Création de la session brouillon uniquement après confirmation.

**Sortie** : `setupSessionId`, restaurant temporaire affiché dans le fil de progression.

### Écran 2 — Identité de l'établissement

**Objectif** : enregistrer l'identité légale et commerciale.

Champs :

- nom de l'enseigne ;
- raison sociale et forme juridique ;
- NIU, RCCM et centre fiscal ;
- pays, ville, adresse, téléphone et email professionnel ;
- devise, préremplie à `FCFA` selon le marché configuré.

UX : validation progressive, exemples locaux, détection des doublons par NIU/email, possibilité de revenir sans perdre les données.

**Bloquant** : nom, ville, adresse, téléphone et email invalides ou doublon non résolu.

### Écran 3 — Profil d'activité

**Objectif** : choisir le modèle opérationnel qui servira de base.

Cartes illustrées :

- Restaurant classique ;
- Fast-food / vente à emporter ;
- Bar / lounge ;
- Boulangerie-pâtisserie ;
- Hôtel / complexe multi-services.

Chaque carte indique les modules proposés, sans activer définitivement de fonctionnalité. Le Super Admin peut ensuite ajuster les options.

**Sortie** : `profileId` et première proposition de modules.

### Écran 4 — Flux de vente

**Objectif** : décrire la manière dont le restaurant vend.

- Nombre de tables et zones de salle ;
- vente au comptoir ;
- vente à emporter ;
- livraison et zones de livraison ;
- réservation ou événements ;
- bar ou comptoir boissons indépendant.

Une illustration en direct montre le circuit `POS -> Cuisine/Bar -> Paiement`. Les choix doivent produire une prévisualisation des modules concernés : Tables, POS, KDS Cuisine, KDS Bar et Livraison.

### Écran 5 — Production, stock et recettes

**Objectif** : choisir le niveau de contrôle opérationnel dès l'ouverture.

- écran cuisine et/ou écran bar ;
- déduction du stock à l'envoi ou à l'encaissement ;
- gestion des recettes et rendements ;
- achats, inventaires et alertes de rupture ;
- impression ticket cuisine/bar si nécessaire.

Le système affiche les dépendances : l'activation du stock exige les unités, les recettes et une politique de déduction ; l'activation du KDS exige au moins un circuit d'envoi.

### Écran 6 — Fiscalité et paiements

**Objectif** : rendre le restaurant conforme avant la première vente.

- profil fiscal et taux applicables ;
- informations visibles sur facture et ticket ;
- moyens de paiement : espèces, Mobile Money, carte, virement ;
- règles d'arrondi et devise ;
- imprimante ticket et format du reçu.

Les calculs restent côté serveur. L'écran doit signaler les données manquantes qui empêcheraient l'émission d'une facture conforme.

### Écran 7 — Personnel et compte propriétaire

**Objectif** : préparer le premier accès sans exposer de secret.

- nom, email et téléphone du propriétaire ;
- rôle propriétaire restaurant : `superadmin` ;
- invitation par lien de création de mot de passe ;
- activation obligatoire de MFA ou PIN selon la politique retenue ;
- aperçu des rôles disponibles : direction, manager, caissier, serveur, cuisine, bar, stock, finance.

Le Super Admin ne saisit jamais le mot de passe définitif du propriétaire. Le backend crée ou relie l'utilisateur, pose les claims et émet un lien d'activation à durée limitée.

### Écran 8 — Matériel et points de vente

**Objectif** : rendre l'installation physique actionnable.

- point de vente principal et éventuelles succursales ;
- nombre de terminaux et limites du plan ;
- imprimantes, écrans KDS et TPE ;
- génération des codes d'appairage matériel séparés du code restaurant.

Le code restaurant ne doit pas être confondu avec un code terminal : les deux usages, durées de vie et révocations doivent être visibles dans l'interface.

### Écran 9 — Revue intelligente

**Objectif** : présenter un DIFF lisible avant toute écriture définitive.

Sections :

- identité et propriétaire ;
- plan et limites ;
- modules activés / désactivés ;
- règles opérationnelles ;
- données obligatoires encore manquantes ;
- impacts sur POS, KDS, stock, caisse et fiscalité.

Actions : `Modifier`, `Enregistrer comme brouillon`, `Valider la configuration`.

La validation exige un motif administratif et une confirmation explicite. Le DIFF final est conservé avec l'audit.

### Écran 10 — Création et contrôle de santé

**Objectif** : exécuter la création atomique et contrôler le résultat.

Progression déterministe :

1. réserver l'identifiant organisation ;
2. créer l'organisation et le tenant ;
3. créer le restaurant principal ;
4. appliquer le plan, le profil et les règles ;
5. créer ou lier le propriétaire ;
6. générer le code restaurant ;
7. créer l'audit et l'instantané de configuration ;
8. lancer les contrôles de santé.

Chaque ligne affiche `En attente`, `En cours`, `Terminé` ou `À corriger`. En cas d'échec, la fonction doit être rejouable sans doublon et l'interface doit afficher une action de reprise ciblée.

### Écran 11 — Remise du code restaurant

**Objectif** : remettre les accès de façon claire et contrôlée.

Le code apparaît une seule fois en grand, avec :

- bouton de copie avec confirmation temporaire ;
- impression ou téléchargement d'une fiche de remise ;
- envoi du lien d'activation au propriétaire ;
- rappel clair : « Ce code identifie votre restaurant. Il ne remplace pas votre mot de passe. »

La fiche contient : nom du restaurant, code restaurant, URL de connexion, email propriétaire, date de création, contact support et procédure de première connexion. Elle ne contient aucun mot de passe ni PIN.

Avant de quitter, le Super Admin doit cocher : « J'ai remis le code au responsable autorisé ». Cette confirmation est auditée avec l'empreinte de la remise.

### Écran 12 — Configuration terminée

**Objectif** : fermer proprement le parcours et orienter vers la suite.

- statut `Configuration initiale terminée` ;
- score de santé et éventuels avertissements non bloquants ;
- boutons : `Ouvrir la fiche restaurant`, `Télécharger le récapitulatif`, `Créer un autre restaurant` ;
- rappel des prochaines actions du propriétaire : activer son compte, créer les utilisateurs, saisir le catalogue, tester un ticket.

## 4. Expérience visuelle plein écran

### Structure

- Shell plein écran sans navigation admin concurrente pendant l'assistant.
- Colonne gauche fixe : logo, étapes, état de sauvegarde, sortie contrôlée.
- Zone centrale : illustration contextualisée, titre court, question principale et contrôles.
- Barre basse persistante : `Retour`, état réseau, `Enregistrer et quitter`, `Continuer`.
- Sur tablette : colonne d'étapes repliable ; sur mobile : progression horizontale et contenu vertical.

### Direction artistique

- Interface claire, premium et opérationnelle ; contraste élevé pour les postes de back-office.
- Une illustration utile par étape, jamais décorative : elle explique la zone ou le flux configuré.
- Transitions courtes entre étapes, respect de `prefers-reduced-motion`.
- Cibles tactiles d'au moins 44 px ; textes de lecture d'au moins 14 px.
- Un seul appel à l'action principal par écran.
- Les états de succès utilisent l'émeraude, les avertissements l'orange et les actions de marque l'ambre, conformément au design system existant.

## 4.1 Plan de redesign moderne

### Hiérarchie d'un écran

Chaque écran doit répondre à une seule question. La composition reste stable :

- **Gauche 1/3** : icône de la section, numéro d'étape, titre très lisible, phrase d'aide courte et état de progression ;
- **Droite 2/3** : contenu de la page, champs regroupés en deux ou trois blocs maximum, puis une seule action principale ;
- **Bas à droite** : `Continuer` ou `Certifier`, toujours au même endroit ;
- **Bas à gauche** : `Retour` et `Enregistrer`, moins contrastés.

Il ne faut pas afficher toute la configuration sur un même écran. Un écran contient idéalement un titre, une phrase d'explication, quatre à six contrôles et une indication d'état.

### Profil métier

Le profil ne doit plus être un select compact ni une liste de cases à cocher. Il devient une sélection de cartes :

- Restaurant classique ;
- Fast-food & vente à emporter ;
- Bar & lounge ;
- Hôtel-restaurant ;
- Livraison & dark kitchen.

Chaque carte contient une icône, un nom en gras, une description d'une ligne et un aperçu de trois modules inclus. Une seule carte est sélectionnable à la fois. La carte active utilise une bordure ambre, un fond ambre très léger, une icône pleine et un indicateur `Sélectionné` ; l'ambre ne doit pas représenter un état opérationnel.

### Options ON/OFF

Les choix binaires deviennent des interrupteurs explicites :

- rail gris + curseur à gauche pour `Désactivé` ;
- rail émeraude + curseur à droite pour `Activé` ;
- libellé d'état visible à côté de chaque interrupteur ;
- cible tactile minimale de 48 px ;
- animation de 160 à 220 ms sur `transform` et `background-color` uniquement ;
- texte de l'option à gauche, interrupteur à droite, sans case à cocher native visible.

Les groupes recommandés sont `Vente`, `Production`, `Stock`, `Paiement`, `Livraison` et `Matériel`. Chaque groupe commence par un titre fort et une courte description ; les options avancées restent masquées derrière `Afficher les options avancées`.

### Typographie et densité

- titre de section : 30 à 44 px, poids 800 ou 900 ;
- titre de bloc : 18 à 22 px, poids 700 ou 800 ;
- label : 14 à 16 px, poids 700 ;
- contenu et aide : 14 à 16 px, interligne confortable ;
- valeurs importantes et états : 16 à 18 px, poids 800 ;
- aucune information essentielle en 10 ou 11 px ;
- largeur de lecture limitée afin que les textes ne deviennent pas des lignes interminables.

### États visuels

- `Activé` : émeraude et icône `Check` ;
- `En attente` : orange et icône `Clock3` ;
- `Erreur` : rouge/rose et message directement sous le contrôle ;
- `Synchronisé` : bleu avec un indicateur discret ;
- `Verrouillé` : fond neutre, icône cadenas et explication courte.

Le système doit éviter les panneaux imbriqués. Une section est une surface claire et large ; les cartes sont réservées aux profils, aux périphériques et aux résumés répétés.

### Mouvement

- ouverture : icône gauche en fondu + translation de 12 px ;
- changement de page : titre et contenu entrent dans le sens de navigation avec une translation maximale de 32 px ;
- sélection d'un profil : bordure et indicateur apparaissent sans déplacer la grille ;
- interrupteur : curseur animé avec une légère compression au clic ;
- certification : séquence courte `Vérification -> Configuration -> Prêt`, puis état de succès ;
- aucune animation `transition: all`, aucun agrandissement depuis `scale(0)` et aucune mise à jour React à chaque frame.

### Écran de revue

La revue finale ne répète pas tous les champs. Elle présente :

- le profil choisi ;
- les modules actifs sous forme de badges lisibles ;
- les options ON/OFF importantes ;
- les éventuels éléments bloquants ;
- le bouton principal `Certifier la configuration`.

Le Super Admin doit comprendre l'état du système en moins de dix secondes.

## 5. Contrat technique cible

### Cloud Functions

Créer ou faire évoluer une fonction dédiée, par exemple `completeRestaurantSetup`, appelée par l'application restaurant à la fin du parcours :

- vérifie le rôle `superadmin` du restaurant ;
- accepte une session de configuration idempotente ;
- valide le payload côté serveur ;
- génère le code restaurant avec CSPRNG ;
- écrit la certification, le snapshot et l'audit ;
- retourne le code en clair une seule fois avec un statut de remise ;
- ne retourne jamais de mot de passe.

### Données à prévoir

- `setup_sessions/{setupSessionId}` : état, étape, brouillon, acteur, expiration ;
- `tenant_access_codes/{orgId}` : hash, suffixe affichable, version, état, dates de création/révocation ;
- `tenant_setup_snapshots/{snapshotId}` : configuration finale immuable ;
- `platform_audit_logs/{logId}` : création, génération, remise et régénération ;
- extension de `Tenant` : `setupStatus`, `setupCompletedAt`, `setupCompletedBy`, `restaurantCodeVersion`.

Les nouveaux types doivent être ajoutés dans `shared/types/` et repris côté `src/types/` si nécessaire. Les règles Firestore ne doivent autoriser aucune écriture directe client sur les codes, snapshots ou audits.

### Connexion restaurant

Le formulaire restaurant demande :

1. code restaurant ;
2. email ou identifiant utilisateur ;
3. mot de passe, PIN ou second facteur selon la politique du rôle.

Le backend résout le code vers l'organisation autorisée, vérifie l'identité et ne révèle pas si un code existe en cas d'échec. Après connexion, le contexte actif est fixé sur l'organisation résolue et le point de vente autorisé.

## 6. Plan de réalisation par lots

### Lot A — Contrats et sécurité

- types `SetupSession`, `TenantAccessCode` et `SetupSnapshot` ;
- claims et matrice RBAC ;
- Cloud Function idempotente ;
- règles Firestore et audit ;
- tests de refus pour tous les rôles non autorisés.

### Lot B — Provisioning et reprise

- création atomique tenant/restaurant/propriétaire ;
- sauvegarde de brouillon ;
- reprise après fermeture et réseau indisponible ;
- contrôles de doublon et de cohérence.

### Lot C — Assistant plein écran

- shell, stepper, transitions et responsive ;
- écrans Identité à Revue ;
- DIFF prédictif ;
- états loading, erreur, offline et reprise.

### Lot D — Remise et connexion

- génération et affichage unique du code ;
- fiche imprimable/téléchargeable ;
- activation du propriétaire ;
- login avec code restaurant ;
- régénération contrôlée et révocation.

### Lot E — Validation terrain

- test tablette et écran desktop large ;
- test d'impression ;
- test avec connexion interrompue ;
- vérification que le code ne fuit ni dans les logs ni dans les exports ;
- recette complète `Admin Panel -> Restaurant -> POS -> KDS -> caisse`.

## 7. Critères d'acceptation

- Un utilisateur qui n'est pas `platform_owner` ou `platform_admin` ne peut ni ouvrir ni appeler le provisioning.
- Un restaurant ne peut être créé qu'une seule fois pour une même session idempotente.
- Le code restaurant est unique, lisible, non devinable par séquence et remis une seule fois.
- Le code seul ne permet jamais de se connecter.
- La fermeture du navigateur reprend au dernier écran confirmé.
- Toute configuration finale possède un snapshot et un audit horodaté.
- Une configuration incomplète ne peut pas passer à `completed`.
- Les changements de modules, limites, fiscalité et paiements sont visibles dans la revue finale.
- Le propriétaire peut activer son compte sans que le Super Admin connaisse son mot de passe.
- Le parcours est utilisable au clavier, sur tablette et en plein écran desktop.
- Les tests couvrent au minimum : succès, droits insuffisants, doublon, expiration de session, panne réseau, reprise, code invalide et régénération auditée.

## 8. Décision recommandée

Conserver `SetupWizardModal` pour les ajustements rapides d'un tenant existant, mais créer un nouveau parcours `InitialRestaurantSetup` pour le provisioning complet. Les deux flux partagent le moteur de profils et le calcul de DIFF, mais seul le second peut créer l'identité du restaurant et générer le code d'accès.