// Application entry point: routing between the collection, the editor and
// the player.

import { getLanguage, setLanguage, t } from './i18n.js';
import { toast } from './ui.js';
import { getDocument } from './store.js';
import { mountCollection } from './collection.js';
import { mountEditor } from './editor.js';
import { mountPlayer } from './player.js';
import { trackView } from './stats.js';

const root = document.getElementById('app');
let currentView = null;
let currentHash = null;
let previousHash = '#/';
let routeToken = 0;

function navigate(hash) {
  if (location.hash === hash) {
    route();
  } else {
    location.hash = hash;
  }
}

async function mountPlay(id) {
  const record = await getDocument(id);
  if (!record) {
    throw new Error(t('notFound'));
  }
  const imageUrl = URL.createObjectURL(record.image);
  // Go back to the editor only when the player was opened from it.
  const backTo = previousHash === `#/edit/${id}` && !record.doc.readonly ? previousHash : '#/';
  const player = mountPlayer(root, {
    doc: record.doc,
    imageUrl,
    t,
    onBack: () => navigate(backTo),
  });
  document.title = `${record.doc.title || t('untitled')} – ${t('appName')}`;
  return {
    destroy() {
      player.destroy();
      URL.revokeObjectURL(imageUrl);
    },
  };
}

async function route() {
  routeToken += 1;
  const token = routeToken;
  const hash = location.hash || '#/';
  if (currentHash !== null && currentHash !== hash) {
    previousHash = currentHash;
  }
  currentHash = hash;

  if (currentView) {
    const leaving = currentView;
    currentView = null;
    await leaving.destroy();
  }
  if (token !== routeToken) {
    return;
  }
  root.replaceChildren();

  const [, name, id] = hash.match(/^#\/(edit|play)\/([\w-]+)$/) || [];
  try {
    let view;
    if (name === 'edit') {
      view = await mountEditor(root, { id, navigate });
    } else if (name === 'play') {
      view = await mountPlay(id);
    } else {
      view = await mountCollection(root, { navigate, reload: route });
    }
    if (token !== routeToken) {
      await view.destroy();
      return;
    }
    currentView = view;
    trackView(name || '', { edit: 'Editor', play: 'Player' }[name] || 'Collection');
  } catch (error) {
    toast(error.message, 'error');
    if (hash !== '#/') {
      navigate('#/');
    }
  }
}

setLanguage(getLanguage());
window.addEventListener('hashchange', route);
route();

// Offline support. Service workers need a secure context (HTTPS or localhost).
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
