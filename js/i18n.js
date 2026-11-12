// User interface strings. French is the reference language.

const STRINGS = {
  fr: {
    appName: 'Xia Express',
    tagline: 'Créez des images interactives',
    collection: 'Collection',
    newDocument: 'Nouvelle image',
    importFile: 'Importer',
    language: 'English',
    help: 'Aide',
    emptyTitle: 'Créez votre première image interactive',
    emptyText: 'Choisissez une image ou déposez-la ici, puis délimitez des zones et décrivez-les.',
    chooseImage: 'Choisir une image',
    dropHint: 'Déposez une image ou un export Xia Express pour l’ajouter à la collection',
    untitled: 'Sans titre',
    readOnly: 'Lecture seule',
    play: 'Lecture',
    edit: 'Modifier',
    more: 'Autres actions',
    metadata: 'Informations du document',
    duplicate: 'Dupliquer',
    exportDoc: 'Exporter',
    remove: 'Supprimer',
    copySuffix: '(copie)',
    confirmDeleteDoc: 'Supprimer définitivement « {0} » ?',
    confirmDeleteDetail: 'Supprimer le détail ?',
    yes: 'Oui',
    no: 'Non',
    ok: 'OK',
    cancel: 'Annuler',
    done: 'Terminer',
    close: 'Fermer',
    back: 'Retour',
    detail: 'Détail',
    zoom: 'Agrandir',
    about: 'À propos de ce document',
    imageInfo: 'À propos de l’image',
    addDetail: 'Créer un détail',
    rectangle: 'Rectangle',
    ellipse: 'Ellipse',
    polygon: 'Polygone',
    undoPoint: 'Retirer le dernier point',
    deleteDetail: 'Supprimer le détail',
    editDetail: 'Modifier le détail',
    finishPolygon: 'Terminer le polygone',
    polygonHint: 'Cliquez sur l’image pour poser les points du polygone, puis validez avec OK.',
    editorHint: 'Double-cliquez sur un détail pour le décrire. Double-cliquez sur un point d’un polygone pour le retirer.',
    detailTitle: 'Titre du détail',
    enableZoom: 'Activer le zoom',
    enableZoomHelp: 'En lecture, le détail peut être agrandi.',
    hideDetail: 'Masquer le contour',
    hideDetailHelp: 'En lecture, le détail est invisible mais reste cliquable.',
    lockDetail: 'Verrouiller le détail',
    lockDetailHelp: 'Le détail ne peut plus être déplacé ni déformé.',
    description: 'Description',
    descriptionPlaceholder: 'Description (Markdown)…',
    write: 'Rédiger',
    preview: 'Aperçu',
    syntaxHelp: 'Markdown : **gras**, *italique*, # titre, - liste, [texte](https://…). '
      + 'Une adresse seule sur une ligne affiche l’image, le son ou la vidéo correspondante.',
    sectionDocument: 'Document',
    sectionImage: 'Image de fond',
    sectionMetas: 'Métadonnées',
    title: 'Titre',
    imageTitle: 'Titre de l’image',
    imageDescription: 'Description de l’image',
    readOnlyHelp: 'Le document s’ouvre directement en lecture ; un code est demandé pour le modifier.',
    code: 'Code',
    codeConfirm: 'Saisir à nouveau le code',
    codeMismatch: 'Les deux codes sont différents.',
    codeRequired: 'Choisissez un code.',
    enterCode: 'Saisir le code',
    wrongCode: 'Code incorrect, veuillez réessayer…',
    meta_creator: 'Auteur',
    meta_rights: 'Droits',
    meta_publisher: 'Éditeur',
    meta_identifier: 'Identifiant',
    meta_source: 'Source',
    meta_date: 'Date',
    meta_language: 'Langues',
    meta_keywords: 'Mots clés',
    meta_contributors: 'Collaborateurs',
    meta_relation: 'Relation',
    meta_coverage: 'Portée',
    meta_license: 'Licence',
    exportTitle: 'Exporter',
    exportHtml: 'Page web autonome (HTML)',
    exportHtmlHelp: 'Un seul fichier, consultable hors ligne et publiable sur un site ou un ENT.',
    exportXml: 'Xia Express (XML)',
    exportXmlHelp: 'Sauvegarde réimportable ici et dans les applications iOS et Android.',
    exportSvg: 'Inkscape (SVG)',
    exportSvgHelp: 'Pour poursuivre le travail dans Inkscape ou Xia sur ordinateur.',
    importOk: 'Import réussi',
    importFailed: 'Fichier incompatible : {0}',
    imageFailed: 'Impossible de lire cette image.',
    saveFailed: 'Enregistrement impossible : {0}',
    notFound: 'Document introuvable.',
    sync: 'Synchroniser',
    syncTitle: 'Synchroniser ma galerie',
    syncText: 'Aujourd’hui, vos images interactives sont enregistrées dans ce navigateur uniquement.\n\n'
      + 'Nous étudions un service en ligne pour **retrouver votre galerie sur tous vos appareils** et '
      + '**partager une image par un simple lien**. Il n’existe pas encore : dites-nous si cela vous serait utile.',
    syncInterested: 'Cela m’intéresse',
    syncThanks: 'Merci, votre intérêt est noté !',
    feedback: 'Donner mon avis',
    statsNotice: 'Ce site mesure sa fréquentation de façon anonyme, sans cookie. '
      + 'Le contenu de vos documents n’est jamais transmis.',
    helpTitle: 'Xia Express',
    helpText: 'Xia Express transforme une image en image interactive : délimitez des zones '
      + '(rectangle, ellipse ou polygone), donnez-leur un titre et une description, puis passez en '
      + 'lecture pour les explorer.\n\n'
      + 'Vos documents sont enregistrés **dans ce navigateur uniquement**. Exportez-les pour les '
      + 'sauvegarder, les partager ou les publier.\n\n'
      + 'Logiciel libre sous licence GPL v3.',
  },
  en: {
    appName: 'Xia Express',
    tagline: 'Create interactive images',
    collection: 'Collection',
    newDocument: 'New image',
    importFile: 'Import',
    language: 'Français',
    help: 'Help',
    emptyTitle: 'Create your first interactive image',
    emptyText: 'Choose an image or drop it here, then outline details and describe them.',
    chooseImage: 'Choose an image',
    dropHint: 'Drop an image or a Xia Express export to add it to the collection',
    untitled: 'Untitled',
    readOnly: 'Read only',
    play: 'Play',
    edit: 'Edit',
    more: 'More actions',
    metadata: 'Document information',
    duplicate: 'Duplicate',
    exportDoc: 'Export',
    remove: 'Delete',
    copySuffix: '(copy)',
    confirmDeleteDoc: 'Permanently delete “{0}”?',
    confirmDeleteDetail: 'Delete detail?',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    cancel: 'Cancel',
    done: 'Done',
    close: 'Close',
    back: 'Back',
    detail: 'Detail',
    zoom: 'Zoom in',
    about: 'About this document',
    imageInfo: 'About the image',
    addDetail: 'Create a detail',
    rectangle: 'Rectangle',
    ellipse: 'Ellipse',
    polygon: 'Polygon',
    undoPoint: 'Remove the last point',
    deleteDetail: 'Delete detail',
    editDetail: 'Edit detail',
    finishPolygon: 'Finish the polygon',
    polygonHint: 'Click on the image to add the points of the polygon, then confirm with OK.',
    editorHint: 'Double-click a detail to describe it. Double-click a polygon point to remove it.',
    detailTitle: 'Detail title',
    enableZoom: 'Enable zoom',
    enableZoomHelp: 'When playing, the detail can be enlarged.',
    hideDetail: 'Hide the outline',
    hideDetailHelp: 'When playing, the detail is invisible but can still be clicked.',
    lockDetail: 'Lock detail',
    lockDetailHelp: 'The detail can no longer be moved or reshaped.',
    description: 'Description',
    descriptionPlaceholder: 'Description (Markdown)…',
    write: 'Write',
    preview: 'Preview',
    syntaxHelp: 'Markdown: **bold**, *italic*, # heading, - list, [text](https://…). '
      + 'An address alone on a line displays the matching image, sound or video.',
    sectionDocument: 'Document',
    sectionImage: 'Background image',
    sectionMetas: 'Metadata',
    title: 'Title',
    imageTitle: 'Image title',
    imageDescription: 'Image description',
    readOnlyHelp: 'The document opens directly in play mode; a code is required to edit it.',
    code: 'Code',
    codeConfirm: 'Type the code again',
    codeMismatch: 'The two codes are different.',
    codeRequired: 'Choose a code.',
    enterCode: 'Enter code',
    wrongCode: 'Wrong code, please try again…',
    meta_creator: 'Creator',
    meta_rights: 'Rights',
    meta_publisher: 'Publisher',
    meta_identifier: 'Identifier',
    meta_source: 'Source',
    meta_date: 'Date',
    meta_language: 'Languages',
    meta_keywords: 'Keywords',
    meta_contributors: 'Contributors',
    meta_relation: 'Relation',
    meta_coverage: 'Coverage',
    meta_license: 'License',
    exportTitle: 'Export',
    exportHtml: 'Standalone web page (HTML)',
    exportHtmlHelp: 'A single file that works offline and can be published on any website or LMS.',
    exportXml: 'Xia Express (XML)',
    exportXmlHelp: 'Backup that can be imported here and in the iOS and Android applications.',
    exportSvg: 'Inkscape (SVG)',
    exportSvgHelp: 'To keep working in Inkscape or in the desktop version of Xia.',
    importOk: 'Import successful',
    importFailed: 'Incompatible file: {0}',
    imageFailed: 'This image cannot be read.',
    saveFailed: 'Saving failed: {0}',
    notFound: 'Document not found.',
    sync: 'Sync',
    syncTitle: 'Sync my gallery',
    syncText: 'Today, your interactive images are stored in this browser only.\n\n'
      + 'We are considering an online service to **find your gallery on all your devices** and '
      + '**share an image with a simple link**. It does not exist yet: tell us whether it would be useful to you.',
    syncInterested: 'I am interested',
    syncThanks: 'Thank you, your interest has been recorded!',
    feedback: 'Give feedback',
    statsNotice: 'This site measures its audience anonymously, without cookies. '
      + 'The content of your documents is never transmitted.',
    helpTitle: 'Xia Express',
    helpText: 'Xia Express turns an image into an interactive image: outline details '
      + '(rectangle, ellipse or polygon), give them a title and a description, then switch to '
      + 'play mode to explore them.\n\n'
      + 'Your documents are stored **in this browser only**. Export them to back them up, share '
      + 'them or publish them.\n\n'
      + 'Free software released under the GPL v3 license.',
  },
};

const STORAGE_KEY = 'xia-express-lang';

function detectLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && STRINGS[stored]) {
      return stored;
    }
  } catch {
    // Storage may be disabled; fall back to the browser language.
  }
  const preferred = (globalThis.navigator && navigator.language) || 'fr';
  return preferred.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

let current = detectLanguage();

export function getLanguage() {
  return current;
}

export function setLanguage(lang) {
  if (!STRINGS[lang]) {
    return;
  }
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Not persisted, the choice only lasts for this session.
  }
  document.documentElement.lang = lang;
}

/** Translate a key; {0}, {1}… are replaced by the extra arguments. */
export function t(key, ...values) {
  const text = STRINGS[current][key] ?? STRINGS.fr[key] ?? key;
  return text.replace(/\{(\d+)\}/g, (match, index) => values[Number(index)] ?? '');
}

/** All the strings of the current language (embedded in the HTML export). */
export function allStrings() {
  return { ...STRINGS[current] };
}

export const LANGUAGES = Object.keys(STRINGS);

/** Exposed for the tests. */
export function stringsOf(lang) {
  return STRINGS[lang];
}
