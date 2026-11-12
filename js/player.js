// Reading mode. This module only depends on shapes.js and markdown.js so that
// it can be embedded as is in the standalone HTML export.

import { bounds, shapePath } from './shapes.js';
import { renderMarkdown } from './markdown.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MAX_ZOOM = 4;
const PLAYER_META_FIELDS = [
  'creator', 'rights', 'publisher', 'identifier', 'source', 'date',
  'language', 'keywords', 'contributors', 'relation', 'coverage', 'license',
];
const PLAYER_ICONS = {
  back: 'M15 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6L6 18',
  info: 'M12 11v6M12 7.5v.5M12 3a9 9 0 100 18 9 9 0 000-18z',
  meta: 'M5 7h14M5 12h14M5 17h9',
  zoom: 'M10.5 4a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM15.5 15.5L20 20M8 10.5h5M10.5 8v5',
};

let playerCounter = 0;

function html(tag, props, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

function svg(tag, attributes, ...children) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes || {})) {
    node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
}

function playerIcon(name) {
  return svg('svg', { viewBox: '0 0 24 24', class: 'xia-icon', 'aria-hidden': 'true' },
    svg('path', { d: PLAYER_ICONS[name] }));
}

function iconButton(name, label, onClick) {
  const button = html('button', { type: 'button', className: 'xia-button', title: label }, playerIcon(name));
  button.setAttribute('aria-label', label);
  button.addEventListener('click', onClick);
  return button;
}

/**
 * Display an interactive image.
 *
 * @param {HTMLElement} root - Element receiving the player.
 * @param {object} options
 * @param {object} options.doc - Document to display.
 * @param {string} options.imageUrl - URL of the background image.
 * @param {(key: string) => string} options.t - Translation function.
 * @param {() => void} [options.onBack] - Displays a "back" button when set.
 * @returns {{ destroy: () => void }}
 */
export function mountPlayer(root, { doc, imageUrl, t, onBack }) {
  const { width, height } = doc.image;
  const container = html('div', { className: 'xia-player' });
  const openDialogs = new Set();

  /** Picture of a single detail: the image clipped by the shape. */
  function cropped(detail, className) {
    const box = bounds(detail.points);
    playerCounter += 1;
    const clipId = `xia-clip-${playerCounter}`;
    return svg('svg', {
      class: className,
      viewBox: `${box.x} ${box.y} ${Math.max(box.w, 1)} ${Math.max(box.h, 1)}`,
      'aria-hidden': 'true',
    },
    svg('clipPath', { id: clipId }, svg('path', { d: shapePath(detail) })),
    svg('image', { href: imageUrl, width, height, 'clip-path': `url(#${clipId})` }));
  }

  function showDialog(className, ...content) {
    const dialog = html('dialog', { className });
    dialog.append(...content);
    // A click on the backdrop targets the dialog element itself.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) {
        dialog.close();
      }
    });
    dialog.addEventListener('close', () => {
      openDialogs.delete(dialog);
      dialog.remove();
    });
    container.append(dialog);
    openDialogs.add(dialog);
    dialog.showModal();
    return dialog;
  }

  function openZoom(detail) {
    const box = bounds(detail.points);
    const picture = cropped(detail, 'xia-zoom-picture');
    const scale = Math.min(
      (window.innerWidth * 0.96) / Math.max(box.w, 1),
      (window.innerHeight * 0.9) / Math.max(box.h, 1),
      MAX_ZOOM,
    );
    picture.style.width = `${Math.round(box.w * scale)}px`;
    picture.style.height = `${Math.round(box.h * scale)}px`;
    const dialog = showDialog('xia-zoom', picture);
    if (detail.title) {
      dialog.append(html('p', { className: 'xia-zoom-caption', textContent: detail.title }));
    }
    dialog.setAttribute('aria-label', detail.title || t('zoom'));
    // Any click closes the zoomed view.
    dialog.addEventListener('click', () => dialog.close());
  }

  /** Popup with an optional picture, a title and a Markdown body. */
  function openPopup({ title, description, detail, extra }) {
    const head = html('header', { className: 'xia-popup-head' });
    if (detail) {
      const picture = cropped(detail, 'xia-thumb-picture');
      if (detail.zoom) {
        const button = html('button', { type: 'button', className: 'xia-thumb xia-thumb-zoom', title: t('zoom') },
          picture, playerIcon('zoom'));
        button.setAttribute('aria-label', t('zoom'));
        button.addEventListener('click', () => openZoom(detail));
        head.append(button);
      } else {
        head.append(html('div', { className: 'xia-thumb' }, picture));
      }
    }
    head.append(html('h2', { className: 'xia-popup-title', textContent: title || '' }));
    const body = html('div', { className: 'xia-popup-body xia-md' });
    body.innerHTML = renderMarkdown(description);
    if (extra) {
      body.append(extra);
    }
    const close = iconButton('close', t('close'), () => dialog.close());
    close.classList.add('xia-popup-close');
    const dialog = showDialog('xia-popup', close, head, body);
    dialog.setAttribute('aria-label', title || t('detail'));
  }

  function openMetadata() {
    const list = html('dl', { className: 'xia-metas' });
    for (const field of PLAYER_META_FIELDS) {
      const value = doc.metas[field];
      if (value) {
        list.append(html('dt', { textContent: t(`meta_${field}`) }), html('dd', { textContent: value }));
      }
    }
    openPopup({ title: doc.title, description: doc.description, extra: list });
  }

  const stage = svg('svg', {
    class: 'xia-stage',
    viewBox: `0 0 ${width} ${height}`,
    role: 'group',
    'aria-label': doc.title || 'Xia Express',
  }, svg('image', { href: imageUrl, width, height }));

  for (const detail of doc.details) {
    if (detail.points.length < 3) {
      continue;
    }
    const path = svg('path', {
      d: shapePath(detail),
      class: detail.hidden ? 'xia-detail xia-detail-hidden' : 'xia-detail',
    });
    const open = () => openPopup({ title: detail.title, description: detail.description, detail });
    path.addEventListener('click', open);
    if (!detail.hidden) {
      // Hidden details are meant to be found: they are not reachable with the keyboard.
      path.setAttribute('tabindex', '0');
      path.setAttribute('role', 'button');
      path.setAttribute('aria-label', detail.title || t('detail'));
      path.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      });
    }
    stage.append(path);
  }

  const left = html('div', { className: 'xia-bar xia-bar-left' });
  const right = html('div', { className: 'xia-bar xia-bar-right' });
  if (onBack) {
    left.append(iconButton('back', t('back'), onBack));
  }
  if (doc.image.title || doc.image.description) {
    left.append(iconButton('info', t('imageInfo'), () => openPopup({
      title: doc.image.title,
      description: doc.image.description,
    })));
  }
  right.append(iconButton('meta', t('about'), openMetadata));

  container.append(stage, left, right);
  root.append(container);

  return {
    destroy() {
      for (const dialog of openDialogs) {
        dialog.close();
      }
      container.remove();
    },
  };
}

/** Entry point of the standalone HTML export. */
export function bootStandalone() {
  const data = JSON.parse(document.getElementById('xia-data').textContent);
  mountPlayer(document.body, {
    doc: data.doc,
    imageUrl: data.image,
    t: (key) => data.strings[key] || key,
  });
}
