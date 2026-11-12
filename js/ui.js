// Small DOM toolkit: element builders, icons, dialogs, menus and toasts.

import { t } from './i18n.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const ICONS = {
  back: 'M15 5l-7 7 7 7',
  plus: 'M12 5v14M5 12h14',
  play: 'M8 5.5v13l11-6.5z',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  pencil: 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
  export: 'M12 15V3M8 7l4-4 4 4M5 12v8h14v-8',
  import: 'M12 3v12M8 11l4 4 4-4M5 17v3h14v-3',
  more: 'M12 5.5v.01M12 12v.01M12 18.5v.01',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3',
  help: 'M9.5 9a2.5 2.5 0 114 2c-1 .8-1.5 1.3-1.5 2.5M12 17v.01M12 3a9 9 0 100 18 9 9 0 000-18z',
  info: 'M12 11v6M12 7.5v.5M12 3a9 9 0 100 18 9 9 0 000-18z',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9v.01',
  cloud: 'M7 18a4 4 0 01-.5-7.97A5.5 5.5 0 0117.2 9.1 4.5 4.5 0 0117 18zM12 16v-5M9.8 13l2.2-2.2 2.2 2.2',
  rectangle: 'M4 6h16v12H4z',
  ellipse: 'M12 6c5 0 8 2.7 8 6s-3 6-8 6-8-2.7-8-6 3-6 8-6z',
  polygon: 'M5 9l8-5 6 6-3 9H7z',
};

function applyProps(node, props) {
  for (const [name, value] of Object.entries(props || {})) {
    if (value === undefined || value === null || value === false) {
      continue;
    }
    if (name === 'on') {
      for (const [type, listener] of Object.entries(value)) {
        node.addEventListener(type, listener);
      }
    } else if (name === 'attrs') {
      for (const [attr, attrValue] of Object.entries(value)) {
        node.setAttribute(attr, attrValue);
      }
    } else if (name === 'dataset') {
      Object.assign(node.dataset, value);
    } else {
      node[name] = value;
    }
  }
}

/** Create an HTML element. */
export function h(tag, props, ...children) {
  const node = document.createElement(tag);
  applyProps(node, props);
  node.append(...children.flat().filter((child) => child !== null && child !== undefined && child !== false));
  return node;
}

/** Create an SVG element; every property is set as an attribute. */
export function s(tag, attributes, ...children) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes || {})) {
    node.setAttribute(name, value);
  }
  node.append(...children.flat());
  return node;
}

export function iconPath(name) {
  return ICONS[name];
}

export function icon(name) {
  return s('svg', { viewBox: '0 0 24 24', class: `icon icon-${name}`, 'aria-hidden': 'true' },
    s('path', { d: ICONS[name] }));
}

/** Button with an icon and an accessible label; `text` adds a visible caption. */
export function iconButton(name, label, onClick, { text, className = '' } = {}) {
  return h('button', {
    type: 'button',
    className: `btn ${text ? 'btn-text' : 'btn-icon'} ${className}`.trim(),
    title: text ? undefined : label,
    attrs: { 'aria-label': label },
    on: { click: onClick },
  }, icon(name), text ? h('span', {}, text) : null);
}

let toastTimer = null;

/** Short message at the bottom of the screen. */
export function toast(message, kind = 'info') {
  let node = document.querySelector('.toast');
  if (!node) {
    node = h('div', { className: 'toast', attrs: { role: 'status', 'aria-live': 'polite' } });
    document.body.append(node);
  }
  // Inside an open dialog the toast must join the top layer to stay visible.
  const host = Array.from(document.querySelectorAll('dialog[open]')).pop() || document.body;
  host.append(node);
  node.textContent = message;
  node.className = `toast toast-${kind} is-visible`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('is-visible'), 4000);
}

/**
 * Modal dialog built on <dialog>.
 *
 * `actions` is a list of { label, value, primary, danger }. The promise
 * resolves with the value of the chosen action, or undefined when the dialog
 * is dismissed. `validate(value)` may return false to keep the dialog open.
 */
export function modal({ title, content, actions, className = '', validate }) {
  let result;
  const form = h('form', { className: 'modal-form', noValidate: true });
  const dialog = h('dialog', { className: `modal ${className}`.trim() }, form);
  const close = (value) => {
    result = value;
    dialog.close();
  };
  const footer = h('footer', { className: 'modal-actions' });
  for (const action of actions) {
    const kind = action.danger ? 'btn-danger' : action.primary ? 'btn-primary' : '';
    footer.append(h('button', {
      type: action.primary ? 'submit' : 'button',
      className: `btn btn-text ${kind}`.trim(),
      on: action.primary ? {} : { click: () => close(action.value) },
    }, action.label));
  }
  form.append(
    title ? h('header', { className: 'modal-head' }, h('h2', {}, title)) : null,
    h('div', { className: 'modal-body' }, content),
    footer,
  );
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const primary = actions.find((action) => action.primary);
    const value = primary ? primary.value : undefined;
    if (!validate || validate(value) !== false) {
      close(value);
    }
  });
  const promise = new Promise((resolve) => {
    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve(result);
    });
  });
  document.body.append(dialog);
  dialog.showModal();
  return { dialog, close, result: promise };
}

export function confirmDialog(message, { danger = false } = {}) {
  return modal({
    content: h('p', { className: 'modal-message' }, message),
    className: 'modal-small',
    actions: [
      { label: t('no'), value: false },
      { label: t('yes'), value: true, primary: true, danger },
    ],
  }).result.then((value) => value === true);
}

/** Drop-down menu anchored to a button. Items: { icon, label, onSelect, danger }. */
export function popupMenu(anchor, items) {
  document.querySelector('.menu')?.remove();
  const menu = h('div', { className: 'menu', attrs: { role: 'menu' } });
  const close = () => {
    menu.remove();
    document.removeEventListener('pointerdown', onOutside, true);
    document.removeEventListener('keydown', onKey, true);
  };
  function onOutside(event) {
    if (!menu.contains(event.target)) {
      close();
    }
  }
  function onKey(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      anchor.focus();
    }
  }
  for (const item of items) {
    menu.append(h('button', {
      type: 'button',
      className: `menu-item ${item.danger ? 'menu-item-danger' : ''}`.trim(),
      attrs: { role: 'menuitem' },
      on: {
        click: () => {
          close();
          item.onSelect();
        },
      },
    }, icon(item.icon), h('span', {}, item.label)));
  }
  document.body.append(menu);
  const rect = anchor.getBoundingClientRect();
  const left = Math.min(Math.max(8, rect.right - menu.offsetWidth), window.innerWidth - menu.offsetWidth - 8);
  const below = rect.bottom + 4;
  const top = below + menu.offsetHeight > window.innerHeight - 8
    ? Math.max(8, rect.top - menu.offsetHeight - 4)
    : below;
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.querySelector('button').focus();
  document.addEventListener('pointerdown', onOutside, true);
  document.addEventListener('keydown', onKey, true);
}

/** Open the system file picker and resolve with the chosen files. */
export function pickFiles(accept, multiple = false) {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept, multiple, hidden: true });
    input.addEventListener('change', () => {
      resolve(Array.from(input.files));
      input.remove();
    });
    input.addEventListener('cancel', () => {
      resolve([]);
      input.remove();
    });
    document.body.append(input);
    input.click();
  });
}
