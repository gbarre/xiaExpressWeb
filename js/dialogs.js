// Forms: detail description, document information, export, read-only code.

import { allStrings, getLanguage, t } from './i18n.js';
import { h, icon, modal, toast } from './ui.js';
import { LICENSES, META_FIELDS } from './model.js';
import { blobToBase64, blobToDataUrl, download, toJpeg } from './images.js';
import { bundleModules, exportName, toInkscapeSvg, toStandaloneHtml, toXiaXml } from './exporter.js';
import { CONFIG } from './config.js';
import { renderMarkdown, safeUrl } from './markdown.js';
import { statsConfigured, trackEvent } from './stats.js';

let fieldCounter = 0;

function fieldId() {
  fieldCounter += 1;
  return `field-${fieldCounter}`;
}

function textField(label, value, props = {}) {
  const id = fieldId();
  const input = h('input', { id, type: 'text', value: value || '', className: 'input', ...props });
  return { input, row: h('div', { className: 'field' }, h('label', { htmlFor: id }, label), input) };
}

function switchField(label, help, checked) {
  const id = fieldId();
  const input = h('input', { id, type: 'checkbox', checked, className: 'switch' });
  const row = h('div', { className: 'field field-switch' },
    input,
    h('label', { htmlFor: id }, label, help ? h('small', {}, help) : null));
  return { input, row };
}

/** Textarea with a "write / preview" toggle for Markdown content. */
function markdownField(label, value, rows = 8) {
  const id = fieldId();
  const textarea = h('textarea', {
    id,
    rows,
    className: 'input',
    value: value || '',
    placeholder: t('descriptionPlaceholder'),
  });
  const preview = h('div', { className: 'md-preview xia-md', hidden: true });
  const writeTab = h('button', { type: 'button', className: 'tab is-active' }, t('write'));
  const previewTab = h('button', { type: 'button', className: 'tab' }, t('preview'));
  const show = (previewing) => {
    if (previewing) {
      preview.innerHTML = renderMarkdown(textarea.value);
    }
    textarea.hidden = previewing;
    preview.hidden = !previewing;
    writeTab.classList.toggle('is-active', !previewing);
    previewTab.classList.toggle('is-active', previewing);
    writeTab.setAttribute('aria-pressed', String(!previewing));
    previewTab.setAttribute('aria-pressed', String(previewing));
  };
  writeTab.addEventListener('click', () => show(false));
  previewTab.addEventListener('click', () => show(true));
  show(false);
  const row = h('div', { className: 'field' },
    h('div', { className: 'field-head' },
      h('label', { htmlFor: id }, label),
      h('div', { className: 'tabs' }, writeTab, previewTab)),
    textarea,
    preview,
    h('small', { className: 'field-help' }, t('syntaxHelp')));
  return { input: textarea, row };
}

/** Edit the title, the options and the description of a detail. */
export async function editDetailDialog(detail) {
  const title = textField(t('detailTitle'), detail.title, { maxLength: 500 });
  const zoom = switchField(t('enableZoom'), t('enableZoomHelp'), detail.zoom);
  const hidden = switchField(t('hideDetail'), t('hideDetailHelp'), detail.hidden);
  const locked = switchField(t('lockDetail'), t('lockDetailHelp'), detail.locked);
  const description = markdownField(t('description'), detail.description);
  const dialog = modal({
    title: t('editDetail'),
    content: [
      title.row,
      h('div', { className: 'field-group' }, zoom.row, hidden.row, locked.row),
      description.row,
    ],
    actions: [
      { label: t('cancel') },
      { label: t('done'), value: true, primary: true },
    ],
  });
  title.input.focus();
  if (!await dialog.result) {
    return null;
  }
  return {
    title: title.input.value.trim(),
    description: description.input.value,
    zoom: zoom.input.checked,
    hidden: hidden.input.checked,
    locked: locked.input.checked,
  };
}

/** Edit the document information. Resolves with the changes, or null. */
export async function metadataDialog(doc) {
  const title = textField(t('title'), doc.title, { maxLength: 500 });
  const description = markdownField(t('description'), doc.description, 5);
  const readonly = switchField(t('readOnly'), t('readOnlyHelp'), doc.readonly);
  const numeric = { type: 'password', inputMode: 'numeric', autocomplete: 'off', maxLength: 64 };
  const code = textField(t('code'), '', numeric);
  const confirm = textField(t('codeConfirm'), '', numeric);
  const codeRows = h('div', { className: 'field-row', hidden: true }, code.row, confirm.row);
  const error = h('p', { className: 'field-error', hidden: true, attrs: { role: 'alert' } });
  // A code is only asked when the protection is being switched on.
  readonly.input.addEventListener('change', () => {
    codeRows.hidden = !(readonly.input.checked && !doc.readonly);
  });

  const imageTitle = textField(t('imageTitle'), doc.image.title, { maxLength: 500 });
  const imageDescription = markdownField(t('imageDescription'), doc.image.description, 4);

  const metas = {};
  const metaRows = [];
  for (const field of META_FIELDS) {
    if (field === 'license') {
      const id = fieldId();
      const options = [...new Set([...LICENSES, doc.metas.license].filter(Boolean))];
      const select = h('select', { id, className: 'input' },
        options.map((name) => h('option', { value: name, selected: name === doc.metas.license }, name)));
      metas[field] = select;
      metaRows.push(h('div', { className: 'field' }, h('label', { htmlFor: id }, t('meta_license')), select));
    } else {
      const entry = textField(t(`meta_${field}`), doc.metas[field], { maxLength: 2000 });
      metas[field] = entry.input;
      metaRows.push(entry.row);
    }
  }

  const dialog = modal({
    title: t('metadata'),
    className: 'modal-wide',
    content: [
      h('fieldset', {}, h('legend', {}, t('sectionDocument')),
        title.row, description.row, readonly.row, codeRows, error),
      h('fieldset', {}, h('legend', {}, t('sectionImage')), imageTitle.row, imageDescription.row),
      h('fieldset', {}, h('legend', {}, t('sectionMetas')), h('div', { className: 'field-grid' }, metaRows)),
    ],
    actions: [
      { label: t('cancel') },
      { label: t('done'), value: true, primary: true },
    ],
    validate: () => {
      if (codeRows.hidden) {
        return true;
      }
      const message = !code.input.value
        ? t('codeRequired')
        : code.input.value !== confirm.input.value ? t('codeMismatch') : '';
      error.textContent = message;
      error.hidden = !message;
      if (message) {
        code.input.focus();
      }
      return !message;
    },
  });
  title.input.focus();
  if (!await dialog.result) {
    return null;
  }
  const enabling = readonly.input.checked && !doc.readonly;
  return {
    title: title.input.value.trim(),
    description: description.input.value,
    readonly: readonly.input.checked,
    code: enabling ? code.input.value : readonly.input.checked ? doc.code : '',
    image: { title: imageTitle.input.value.trim(), description: imageDescription.input.value },
    metas: Object.fromEntries(META_FIELDS.map((field) => [field, metas[field].value.trim()])),
  };
}

/** Apply the result of metadataDialog to a document. */
export function applyMetadata(doc, changes) {
  doc.title = changes.title;
  doc.description = changes.description;
  doc.readonly = changes.readonly;
  doc.code = changes.code;
  doc.image.title = changes.image.title;
  doc.image.description = changes.image.description;
  Object.assign(doc.metas, changes.metas);
}

// Documents unlocked during this session.
const unlocked = new Set();

/**
 * Ask for the code of a read-only document.
 * The code is a classroom convenience, not a security feature: it is stored
 * in clear text, like in the native applications.
 */
export async function ensureUnlocked(doc) {
  if (!doc.readonly || unlocked.has(doc.id)) {
    return true;
  }
  const code = textField(t('code'), '', {
    type: 'password', inputMode: 'numeric', autocomplete: 'off',
  });
  const error = h('p', { className: 'field-error', hidden: true, attrs: { role: 'alert' } }, t('wrongCode'));
  const dialog = modal({
    title: t('enterCode'),
    className: 'modal-small',
    content: [code.row, error],
    actions: [
      { label: t('cancel') },
      { label: t('ok'), value: true, primary: true },
    ],
    validate: () => {
      const valid = code.input.value === doc.code;
      error.hidden = valid;
      if (!valid) {
        code.input.select();
      }
      return valid;
    },
  });
  code.input.focus();
  if (!await dialog.result) {
    return false;
  }
  unlocked.add(doc.id);
  return true;
}

async function fetchText(path) {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok) {
    throw new Error(`${path}: HTTP ${response.status}`);
  }
  return response.text();
}

async function standaloneHtml(doc, imageBlob) {
  const names = ['shapes.js', 'markdown.js', 'player.js'];
  const [css, ...sources] = await Promise.all([
    fetchText('../css/player.css'),
    ...names.map((name) => fetchText(`./${name}`)),
  ]);
  const script = bundleModules(
    names.map((name, index) => ({ name, code: sources[index] })),
    "modules['player.js'].bootStandalone();",
  );
  return toStandaloneHtml({
    doc,
    imageDataUrl: await blobToDataUrl(imageBlob),
    css,
    script,
    strings: allStrings(),
    lang: getLanguage(),
  });
}

const EXPORTS = [
  {
    key: 'exportHtml',
    icon: 'globe',
    extension: 'html',
    type: 'text/html',
    build: standaloneHtml,
  },
  {
    key: 'exportXml',
    icon: 'export',
    extension: 'xml',
    type: 'application/xml',
    build: async (doc, imageBlob) => toXiaXml(doc, await blobToBase64(await toJpeg(imageBlob))),
  },
  {
    key: 'exportSvg',
    icon: 'polygon',
    extension: 'svg',
    type: 'image/svg+xml',
    build: async (doc, imageBlob) => toInkscapeSvg(doc, await blobToBase64(await toJpeg(imageBlob))),
  },
];

/** Let the user choose an export format and download the file. */
export function exportDialog(doc, imageBlob) {
  const dialog = modal({
    title: t('exportTitle'),
    content: h('div', { className: 'choices' }, EXPORTS.map((format) => h('button', {
      type: 'button',
      className: 'choice',
      on: {
        click: async (event) => {
          const button = event.currentTarget;
          button.disabled = true;
          try {
            const content = await format.build(doc, imageBlob);
            download(`${exportName(doc)}.${format.extension}`, new Blob([content], { type: format.type }));
            trackEvent('export', format.extension);
            dialog.close();
          } catch (error) {
            button.disabled = false;
            toast(t('saveFailed', error.message), 'error');
          }
        },
      },
    }, icon(format.icon), h('span', {}, h('strong', {}, t(format.key)), h('small', {}, t(`${format.key}Help`)))))),
    actions: [{ label: t('close') }],
  });
  return dialog.result;
}

function feedbackLink() {
  const url = safeUrl(CONFIG.feedbackUrl);
  if (!url) {
    return null;
  }
  return h('p', {}, h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, t('feedback')));
}

export function helpDialog() {
  const body = h('div', { className: 'xia-md' });
  body.innerHTML = renderMarkdown(statsConfigured() ? `${t('helpText')}\n\n${t('statsNotice')}` : t('helpText'));
  body.append(feedbackLink() || '');
  return modal({
    title: t('helpTitle'),
    content: body,
    actions: [{ label: t('close'), value: true, primary: true }],
  }).result;
}

/** True when the survey about an online service can be offered. */
export function syncSurveyAvailable() {
  return statsConfigured() || Boolean(safeUrl(CONFIG.feedbackUrl));
}

const SYNC_INTEREST_KEY = 'xia-express-sync-interest';

/**
 * Survey: would an online gallery be useful? Each browser is counted once.
 */
export async function syncDialog() {
  trackEvent('sync', 'open');
  const body = h('div', { className: 'xia-md' });
  body.innerHTML = renderMarkdown(t('syncText'));
  body.append(feedbackLink() || '');
  const interested = await modal({
    title: t('syncTitle'),
    content: body,
    actions: [
      { label: t('close') },
      { label: t('syncInterested'), value: true, primary: true },
    ],
  }).result;
  if (!interested) {
    return;
  }
  let alreadyCounted = false;
  try {
    alreadyCounted = localStorage.getItem(SYNC_INTEREST_KEY) === '1';
    localStorage.setItem(SYNC_INTEREST_KEY, '1');
  } catch {
    // Storage disabled: the click is counted, possibly more than once.
  }
  if (!alreadyCounted) {
    trackEvent('sync', 'interested');
  }
  toast(t('syncThanks'));
}
