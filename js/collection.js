// Home screen: the collection of interactive images.

import { getLanguage, setLanguage, t } from './i18n.js';
import { confirmDialog, h, icon, iconButton, pickFiles, popupMenu, toast } from './ui.js';
import { deleteDocument, getDocument, listDocuments, saveDocument } from './store.js';
import { ACCEPT_IMAGES, ACCEPT_IMPORT, duplicateDocument, importFile } from './importer.js';
import {
  applyMetadata, ensureUnlocked, exportDialog, helpDialog, metadataDialog, syncDialog, syncSurveyAvailable,
} from './dialogs.js';
import { trackEvent } from './stats.js';

export async function mountCollection(root, { navigate, reload }) {
  const grid = h('div', { className: 'grid' });
  const dropHint = h('div', { className: 'drop-hint', hidden: true }, icon('import'), h('p', {}, t('dropHint')));

  /** Import files; open the editor when a single image was added. */
  async function addFiles(files, openSingle) {
    let lastId = null;
    let created = 0;
    for (const file of files) {
      try {
        lastId = await importFile(file);
        created += 1;
        trackEvent('document', file.type.startsWith('image/') ? 'create' : 'import');
      } catch (error) {
        toast(t('importFailed', error.message), 'error');
      }
    }
    if (created === 1 && openSingle) {
      navigate(`#/edit/${lastId}`);
    } else if (created) {
      toast(t('importOk'));
      await refresh();
    }
  }

  const createFromPicker = async () => addFiles(await pickFiles(ACCEPT_IMAGES), true);
  const importFromPicker = async () => addFiles(await pickFiles(ACCEPT_IMPORT, true), false);

  async function editMetadata(record) {
    if (!await ensureUnlocked(record.doc)) {
      return;
    }
    const changes = await metadataDialog(record.doc);
    if (changes) {
      applyMetadata(record.doc, changes);
      await saveDocument(record.doc);
      await refresh();
    }
  }

  async function remove(record) {
    if (!await ensureUnlocked(record.doc)) {
      return;
    }
    const title = record.doc.title || t('untitled');
    if (await confirmDialog(t('confirmDeleteDoc', title), { danger: true })) {
      await deleteDocument(record.id);
      await refresh();
    }
  }

  async function exportRecord(record) {
    const full = await getDocument(record.id);
    if (full) {
      await exportDialog(full.doc, full.image);
    }
  }

  function card(record) {
    const { doc } = record;
    const title = doc.title || t('untitled');
    const target = doc.readonly ? `#/play/${doc.id}` : `#/edit/${doc.id}`;
    const menuButton = iconButton('more', t('more'), () => popupMenu(menuButton, [
      { icon: 'pencil', label: t('edit'), onSelect: () => navigate(`#/edit/${doc.id}`) },
      { icon: 'info', label: t('metadata'), onSelect: () => editMetadata(record) },
      {
        icon: 'copy',
        label: t('duplicate'),
        onSelect: async () => {
          await duplicateDocument(doc.id);
          await refresh();
        },
      },
      { icon: 'export', label: t('exportDoc'), onSelect: () => exportRecord(record) },
      { icon: 'trash', label: t('remove'), danger: true, onSelect: () => remove(record) },
    ]));
    return h('article', { className: 'card' },
      h('a', { className: 'card-link', href: target, attrs: { 'aria-label': title } },
        h('img', { className: 'card-thumb', src: record.thumb, alt: '', loading: 'lazy' }),
        doc.readonly ? h('span', { className: 'card-lock', title: t('readOnly') }, icon('lock')) : null),
      h('div', { className: 'card-foot' },
        h('h2', { className: 'card-title', title }, title),
        iconButton('play', t('play'), () => navigate(`#/play/${doc.id}`)),
        menuButton));
  }

  async function refresh() {
    const records = await listDocuments();
    records.sort((a, b) => (a.doc.title || '').localeCompare(b.doc.title || '', getLanguage(), { numeric: true })
      || a.updated - b.updated);
    if (records.length) {
      grid.className = 'grid';
      grid.replaceChildren(...records.map(card));
    } else {
      grid.className = 'empty';
      grid.replaceChildren(
        h('img', { className: 'empty-logo', src: 'icons/icon-192.png', alt: '' }),
        h('h2', {}, t('emptyTitle')),
        h('p', {}, t('emptyText')),
        iconButton('image', t('chooseImage'), createFromPicker, { text: t('chooseImage'), className: 'btn-primary' }),
      );
    }
  }

  const header = h('header', { className: 'toolbar' },
    h('h1', { className: 'toolbar-brand' }, t('appName')),
    h('span', { className: 'toolbar-space' }),
    iconButton('plus', t('newDocument'), createFromPicker, { text: t('newDocument') }),
    iconButton('import', t('importFile'), importFromPicker, { text: t('importFile') }),
    syncSurveyAvailable() ? iconButton('cloud', t('syncTitle'), syncDialog, { text: t('sync') }) : null,
    iconButton('globe', t('language'), () => {
      setLanguage(getLanguage() === 'fr' ? 'en' : 'fr');
      reload();
    }),
    iconButton('help', t('help'), helpDialog));

  const view = h('div', { className: 'collection' }, header, h('main', { className: 'collection-main' }, grid), dropHint);

  // Drag and drop, and paste, anywhere on the page.
  let dragDepth = 0;
  const hasFiles = (event) => Array.from(event.dataTransfer?.types || []).includes('Files');
  const listeners = {
    dragenter: (event) => {
      if (hasFiles(event)) {
        dragDepth += 1;
        dropHint.hidden = false;
      }
    },
    dragleave: (event) => {
      if (hasFiles(event)) {
        dragDepth = Math.max(0, dragDepth - 1);
        dropHint.hidden = dragDepth === 0;
      }
    },
    dragover: (event) => {
      if (hasFiles(event)) {
        event.preventDefault();
      }
    },
    drop: (event) => {
      if (hasFiles(event)) {
        event.preventDefault();
        dragDepth = 0;
        dropHint.hidden = true;
        addFiles(Array.from(event.dataTransfer.files), true);
      }
    },
    paste: (event) => {
      if (document.querySelector('dialog[open]')) {
        return;
      }
      const files = Array.from(event.clipboardData?.files || []);
      if (files.length) {
        event.preventDefault();
        addFiles(files, true);
      }
    },
  };
  for (const [type, listener] of Object.entries(listeners)) {
    window.addEventListener(type, listener);
  }

  document.title = t('appName');
  root.append(view);
  await refresh();

  return {
    destroy() {
      for (const [type, listener] of Object.entries(listeners)) {
        window.removeEventListener(type, listener);
      }
      view.remove();
    },
  };
}
