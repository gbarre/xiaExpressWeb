# Xia Express Web

Xia Express permet de créer des **images interactives** : on part d'une image, on y délimite des zones
(les « détails »), on leur donne un titre et une description, puis on explore le résultat en mode lecture.

Cette version fonctionne entièrement dans le navigateur. Elle remplace les applications pour tablettes
[iOS](https://apps.apple.com/fr/app/xia-express/id1125103930) et
[Android](https://f-droid.org/packages/fr.ac_versailles.dane.xiaexpress/), dont elle reprend le principe
et le format de fichier.

## Fonctionnalités

- Collection d'images interactives, enregistrée dans le navigateur.
- Détails en forme de rectangle, d'ellipse ou de polygone libre, déplaçables et déformables.
- Pour chaque détail : titre, description en Markdown, zoom, contour masqué, verrouillage.
- Mode lecture : un clic sur un détail ouvre une fenêtre avec le détail détouré, son titre et sa description.
- Informations du document : titre, description, image de fond, métadonnées Dublin Core, licence.
- Lecture seule protégée par un code.
- Export en page web autonome, en XML Xia Express et en SVG pour Inkscape.
- Interface en français et en anglais, utilisable à la souris, au doigt et au clavier.
- Utilisable hors ligne une fois chargée (application web installable).

## Utilisation

### Créer une image interactive

1. Depuis la collection, choisir **Nouvelle image**, ou déposer ou coller une image dans la page.
2. Dans l'éditeur, le bouton **+** crée un rectangle, une ellipse ou un polygone.
3. Pour un polygone, cliquer sur l'image pour poser les points, puis valider avec **OK**.
4. Double-cliquer sur un détail pour saisir son titre, sa description et ses options.
5. Le bouton de lecture affiche le résultat.

### Modifier un détail

| Action | Geste |
| --- | --- |
| Sélectionner | Clic sur le détail |
| Déplacer | Glisser le détail, ou touches fléchées (avec Maj : par pas de 10) |
| Déformer | Glisser une poignée |
| Ajouter un point à un polygone | Glisser une poignée intermédiaire, au milieu d'un côté |
| Retirer un point d'un polygone | Double-clic sur le point |
| Décrire | Double-clic sur le détail, ou touche Entrée |
| Supprimer | Bouton corbeille, ou touche Suppr |
| Désélectionner | Clic en dehors, ou touche Échap |

### Options d'un détail

- **Activer le zoom** : en lecture, la vignette du détail peut être agrandie en plein écran.
- **Masquer le contour** : en lecture, le détail est invisible mais reste cliquable. Dans l'éditeur, son
  contour est dessiné en pointillés.
- **Verrouiller le détail** : le détail ne peut plus être déplacé, déformé ni supprimé tant que l'option
  est active.

### Descriptions

Les descriptions sont rédigées en Markdown : titres, gras, italique, listes, citations, code, liens et images.
Les retours à la ligne sont conservés.

Une adresse placée seule sur une ligne est remplacée par le média correspondant :

- un fichier image, audio ou vidéo est affiché ou lu directement ;
- une page YouTube, Vimeo, Dailymotion ou PeerTube est remplacée par son lecteur intégré.

Le HTML brut n'est pas interprété : il est affiché tel quel.

## Formats d'import et d'export

| Format | Export | Import | Usage |
| --- | --- | --- | --- |
| Page web autonome (`.html`) | oui | oui | Diffusion : un seul fichier, lisible hors ligne |
| Xia Express (`.xml`) | oui | oui | Sauvegarde, échange avec les applications iOS et Android |
| Inkscape (`.svg`) | oui | non | Poursuite du travail dans Inkscape ou Xia sur ordinateur |
| Image (JPEG, PNG, WebP, GIF) | non | oui | Création d'un nouveau document |

### Compatibilité avec les applications iOS et Android

Les fichiers XML exportés par les applications natives s'importent directement. Leurs descriptions utilisent
une syntaxe de type wiki (`***gras***`, `**italique**`, `{{{code}}}`, `[https://… texte]`) : elle est
convertie en Markdown à l'import.

Dans l'autre sens, les fichiers XML exportés ici s'ouvrent dans les applications natives, avec deux limites :

- les descriptions restent en Markdown, que ces applications affichent sans mise en forme ;
- le masquage est réglé détail par détail ici, alors que les applications natives ne connaissent qu'un réglage
  global : les contours y sont affichés dès qu'un détail au moins est visible.

Les applications natives s'appuyaient sur un service oEmbed externe pour intégrer les médias. Il n'est plus
utilisé : les lecteurs intégrés sont limités aux services cités plus haut.

## Données et confidentialité

Il n'y a ni serveur applicatif ni compte utilisateur. Les documents sont enregistrés dans le navigateur
(IndexedDB) et n'en sortent que par un export.

- Les documents sont propres à un navigateur et à une adresse de site : ils ne suivent pas l'utilisateur
  d'un poste à l'autre.
- Effacer les données de navigation supprime la collection. L'export XML sert de sauvegarde.
- Les médias intégrés dans les descriptions sont chargés depuis leur site d'origine au moment de l'affichage.
- Si l'exploitant du site l'a activée, une mesure d'audience anonyme est effectuée (voir
  [Statistiques d'usage](#statistiques-dusage)). Elle ne transmet jamais le contenu des documents.
- Le code de lecture seule est une commodité de classe, pas une protection : il est enregistré en clair,
  comme dans les applications natives. Il n'est pas inclus dans l'export en page web autonome.

## Installation

L'application est un site statique, sans étape de construction ni dépendance à l'exécution. Il suffit de
publier le contenu du dépôt (hors `tests/`, `node_modules/` et fichiers de configuration) sur un serveur web.

Pour un essai local :

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

puis ouvrir <http://127.0.0.1:8080/>. Un serveur est nécessaire : les modules JavaScript ne se chargent pas
depuis `file://`.

### Recommandations de déploiement

- Servir le site en HTTPS : le fonctionnement hors ligne et l'installation en dépendent.
- La politique de sécurité de contenu est déclarée dans `index.html`. Elle peut être reprise en en-tête HTTP,
  ce qui permet d'y ajouter `frame-ancestors`.
- Ne pas mettre `sw.js` en cache longue durée, pour que les mises à jour soient prises en compte.

Exemple pour nginx :

```nginx
server {
    listen 443 ssl;
    server_name xia.example.org;
    root /var/www/xia-express;

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "frame-ancestors 'self'" always;

    location = /sw.js {
        add_header Cache-Control "no-cache";
    }
}
```

### Publication sur GitHub Pages

Le workflow `.github/workflows/pages.yml` lance les tests et le lint à chaque poussée, puis publie
l'application sur GitHub Pages depuis la branche `main`. Seuls les fichiers de l'application sont publiés.

1. Créer le dépôt sur GitHub et y pousser la branche `main`.
2. Dans **Settings > Pages**, choisir **GitHub Actions** comme source.
3. Pour un nom de domaine personnalisé, le déclarer dans **Settings > Pages** et créer l'enregistrement
   DNS `CNAME` correspondant.

L'application n'utilise que des chemins relatifs : elle fonctionne aussi bien à la racine d'un domaine que
dans un sous-dossier.

## Configuration

Les réglages propres à un site sont regroupés dans `js/config.js`.

| Réglage | Rôle |
| --- | --- |
| `matomoUrl` | Adresse HTTPS de l'instance Matomo. Vide : aucune statistique |
| `matomoSiteId` | Identifiant du site dans Matomo |
| `feedbackUrl` | Page où donner son avis (tickets, formulaire). Vide : pas de lien |

Dès qu'un de ces réglages est renseigné, la collection affiche un bouton **Synchroniser**. Il présente
le projet de service en ligne et permet de signaler son intérêt : c'est un sondage, aucune synchronisation
n'est encore proposée.

### Statistiques d'usage

La mesure d'audience s'appuie sur une instance [Matomo](https://matomo.org/), qui peut suivre plusieurs
sites : il suffit d'y déclarer un nouveau site (**Administration > Sites web**) et de reporter son
identifiant dans `js/config.js`.

Aucun script tiers n'est chargé : l'application appelle directement l'API de suivi de Matomo par une
requête d'image, ce que la politique de sécurité de contenu autorise déjà.

Sont transmis :

- l'écran affiché (collection, éditeur, lecture) ;
- quelques actions : création, import, export avec son format, ouverture du sondage et intérêt déclaré.

Ne sont jamais transmis : le titre, l'identifiant et le contenu des documents. L'application ne dépose
aucun cookie de mesure et n'envoie rien si le navigateur signale « Do Not Track » ou « Global Privacy
Control », ni depuis `localhost`. Les pages web autonomes exportées ne contiennent aucune mesure.

Côté Matomo, l'adresse IP et l'agent utilisateur sont reçus comme pour toute requête. Pour rester dans le
cadre de l'exemption de consentement de la CNIL, anonymiser les adresses IP et limiter la durée de
conservation dans **Administration > Vie privée**.

Les actions apparaissent dans **Comportement > Événements**, sous les catégories `document`, `export`
et `sync`. Le nombre d'événements `sync` / `interested` donne le nombre de navigateurs ayant déclaré leur
intérêt, chacun n'étant compté qu'une fois.

## Développement

```sh
npm install
npm test
npm run lint
```

Les tests utilisent le lanceur intégré à Node.js (version 20 ou supérieure). Les dépendances ne servent
qu'à l'analyse du code (ESLint, markdownlint).

### Organisation du code

| Fichier | Rôle |
| --- | --- |
| `index.html`, `css/app.css` | Page et styles de l'application |
| `css/player.css` | Styles du mode lecture, repris dans l'export HTML |
| `js/app.js` | Point d'entrée et navigation |
| `js/collection.js` | Écran d'accueil |
| `js/editor.js` | Éditeur de détails |
| `js/player.js` | Mode lecture, repris dans l'export HTML |
| `js/dialogs.js`, `js/ui.js` | Formulaires, fenêtres, menus |
| `js/model.js`, `js/shapes.js` | Modèle de document et géométrie |
| `js/markdown.js` | Rendu Markdown |
| `js/exporter.js`, `js/importer.js`, `js/legacy.js` | Formats de fichier et compatibilité |
| `js/store.js`, `js/images.js` | Stockage local et traitement des images |
| `js/i18n.js` | Textes de l'interface |
| `js/config.js`, `js/stats.js` | Réglages du site et mesure d'audience |
| `sw.js`, `manifest.webmanifest` | Fonctionnement hors ligne et installation |

Le rendu Markdown est écrit sans dépendance. Le texte saisi est toujours échappé, et seules les adresses
`http`, `https` et `mailto` sont acceptées : les tests de `tests/markdown.test.js` couvrent les tentatives
d'injection.

L'export en page web autonome assemble `shapes.js`, `markdown.js` et `player.js` en un seul script. Ces
trois modules doivent donc s'en tenir à des imports et exports nommés, un import par ligne.

En cas d'ajout d'un fichier à l'application, l'ajouter aussi à la liste `ASSETS` de `sw.js`.

## Licence

Logiciel libre distribué sous licence [GPL version 3](LICENCE) ou ultérieure, comme les applications
d'origine.
