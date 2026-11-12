// Import and export formats. Everything here works on strings so that it can
// be unit tested without a browser, except parseXiaXml which needs a DOMParser.

import { META_FIELDS, cleanFileName, isComplete } from './model.js';
import { SHAPE_ELLIPSE, SHAPE_POLYGON, SHAPE_RECTANGLE, bounds, formatPath, parsePath, roundCoord } from './shapes.js';
import { pikipikiToMarkdown } from './legacy.js';

const XML_HEADER = '<?xml version="1.0" encoding="utf-8" standalone="no"?>\n';
const DETAIL_STYLE = 'opacity:0.3;fill:#ff0000;stroke:#000000;stroke-width:0.1;'
  + 'stroke-miterlimit:4;stroke-dasharray:none;stroke-opacity:1';

// Elements stored as children of <xia> in the legacy format.
const XML_ELEMENTS = [
  'title', 'description', 'creator', 'rights', 'license', 'date', 'publisher',
  'identifier', 'source', 'relation', 'language', 'keywords', 'coverage', 'contributors',
];

const CC = 'http://creativecommons.org/';
const BY = ['Reproduction:permits', 'Distribution:permits', 'Notice:requires', 'Attribution:requires'];
const LICENSE_RDF = {
  'CC Attribution - CC-BY': [`${CC}licenses/by/3.0/`, [...BY, 'DerivativeWorks:permits']],
  'CC Attribution-ShareALike - CC-BY-SA': [`${CC}licenses/by-sa/3.0/`,
    [...BY, 'DerivativeWorks:permits', 'ShareAlike:requires']],
  'CC Attribution-NoDerivs - CC-BY-ND': [`${CC}licenses/by-nd/3.0/`, BY],
  'CC Attribution-NonCommercial - CC-BY-NC': [`${CC}licenses/by-nc/3.0/`,
    [...BY, 'CommercialUse:prohibits', 'DerivativeWorks:permits']],
  'CC Attribution-NonCommercial-ShareALike - CC-BY-NC-SA': [`${CC}licenses/by-nc-sa/3.0/`,
    [...BY, 'CommercialUse:prohibits', 'DerivativeWorks:permits', 'ShareAlike:requires']],
  'CC Attribution-NonCommercial-NoDerivs - CC-BY-NC-ND': [`${CC}licenses/by-nc-nd/3.0/`,
    [...BY, 'CommercialUse:prohibits']],
  'CC0 Public Domain Dedication': [`${CC}publicdomain/zero/1.0/`,
    ['Reproduction:permits', 'Distribution:permits', 'DerivativeWorks:permits']],
  'Free Art': ['http://artlibre.org/licence/lal',
    [...BY, 'DerivativeWorks:permits', 'ShareAlike:requires']],
};

export function escapeXml(value) {
  return String(value ?? '')
    // Control characters are not allowed in XML 1.0.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function attrs(map) {
  return Object.entries(map).map(([name, value]) => ` ${name}="${escapeXml(value)}"`).join('');
}

function metaValue(doc, name) {
  if (name === 'title' || name === 'description') {
    return doc[name];
  }
  return doc.metas[name] || '';
}

/** Base name used for exported files. */
export function exportName(doc) {
  return cleanFileName(doc.title, `xia-${doc.id.slice(0, 8)}`);
}

/**
 * Xia Express XML, readable by the iOS and Android applications.
 * The "syntax" attribute tells this application that descriptions are
 * Markdown; legacy applications ignore it.
 */
export function toXiaXml(doc, jpegBase64) {
  const lines = [`${XML_HEADER}<XiaiPad>`, '<xia syntax="markdown">'];
  for (const name of XML_ELEMENTS) {
    lines.push(`<${name}>${escapeXml(metaValue(doc, name))}</${name}>`);
  }
  lines.push(`<readonly${attrs({ code: doc.code })}>${doc.readonly}</readonly>`);
  lines.push(`<image${attrs({ title: doc.image.title, description: doc.image.description })} />`);
  const details = doc.details.filter(isComplete);
  // Legacy applications only know a global switch.
  const show = details.length === 0 || details.some((detail) => !detail.hidden);
  lines.push(`<details${attrs({ show })}>`);
  for (const detail of details) {
    const detailAttrs = attrs({
      tag: detail.tag,
      zoom: detail.zoom,
      locked: detail.locked,
      hidden: detail.hidden,
      title: detail.title,
      path: formatPath(detail.points),
      constraint: detail.shape,
    });
    lines.push(`<detail${detailAttrs}>${escapeXml(detail.description)}</detail>`);
  }
  lines.push('</details>', '</xia>', `<image>${jpegBase64}</image>`, '</XiaiPad>', '');
  return lines.join('\n');
}

function childText(parent, name) {
  for (const child of parent.children) {
    if (child.tagName === name) {
      return child.textContent || '';
    }
  }
  return '';
}

function childElement(parent, name) {
  for (const child of parent.children) {
    if (child.tagName === name) {
      return child;
    }
  }
  return null;
}

/**
 * Parse a Xia Express XML file.
 * Returns the document (image size still unknown) and the base64 JPEG.
 */
export function parseXiaXml(xmlText, parser = new DOMParser()) {
  const xml = parser.parseFromString(xmlText, 'application/xml');
  const root = xml.documentElement;
  if (!root || root.tagName !== 'XiaiPad' || xml.getElementsByTagName('parsererror').length) {
    throw new Error('Not a Xia Express XML file');
  }
  const xia = childElement(root, 'xia');
  const imageBase64 = childText(root, 'image').replace(/\s+/g, '');
  if (!xia || !imageBase64) {
    throw new Error('Not a Xia Express XML file');
  }
  const isMarkdown = xia.getAttribute('syntax') === 'markdown';
  const convert = (value) => (isMarkdown ? value : pikipikiToMarkdown(value));

  const metas = {};
  for (const field of META_FIELDS) {
    metas[field] = childText(xia, field);
  }
  // Very old files used <author> instead of <creator>.
  metas.creator = metas.creator || childText(xia, 'author');

  const readonly = childElement(xia, 'readonly');
  const image = childElement(xia, 'image');
  const detailsNode = childElement(xia, 'details');
  const showAll = !detailsNode || detailsNode.getAttribute('show') !== 'false';
  const details = [];
  for (const node of detailsNode ? detailsNode.children : []) {
    if (node.tagName !== 'detail') {
      continue;
    }
    const hidden = node.getAttribute('hidden');
    details.push({
      tag: Number.parseInt(node.getAttribute('tag'), 10),
      shape: node.getAttribute('constraint') || SHAPE_POLYGON,
      points: parsePath(node.getAttribute('path')),
      title: node.getAttribute('title') || '',
      description: convert(node.textContent || ''),
      zoom: node.getAttribute('zoom') === 'true',
      locked: node.getAttribute('locked') === 'true',
      hidden: hidden === null ? !showAll : hidden === 'true',
    });
  }

  return {
    imageBase64,
    raw: {
      title: childText(xia, 'title'),
      description: convert(childText(xia, 'description')),
      readonly: readonly ? readonly.textContent.trim() === 'true' : false,
      code: readonly ? readonly.getAttribute('code') || '' : '',
      metas,
      image: {
        title: image ? image.getAttribute('title') || '' : '',
        description: convert(image ? image.getAttribute('description') || '' : ''),
      },
      details,
    },
  };
}

/** SVG file compatible with Inkscape and the desktop version of Xia. */
export function toInkscapeSvg(doc, jpegBase64, svgId = 1000 + Math.floor(Math.random() * 8000)) {
  const { width, height } = doc.image;
  const name = exportName(doc);
  const agent = (tag, value) => `<dc:${tag}><cc:Agent><dc:title>${escapeXml(value)}</dc:title></cc:Agent></dc:${tag}>`;
  const [licenseUrl, permits] = LICENSE_RDF[doc.metas.license] || ['', []];

  const out = [XML_HEADER.trimEnd()];
  out.push(`<svg${attrs({
    'xmlns:dc': 'http://purl.org/dc/elements/1.1/',
    'xmlns:cc': 'http://creativecommons.org/ns#',
    'xmlns:rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    'xmlns:svg': 'http://www.w3.org/2000/svg',
    xmlns: 'http://www.w3.org/2000/svg',
    'xmlns:xlink': 'http://www.w3.org/1999/xlink',
    'xmlns:sodipodi': 'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd',
    'xmlns:inkscape': 'http://www.inkscape.org/namespaces/inkscape',
    id: `svg${svgId}`,
    version: '1.1',
    'inkscape:version': '0.91',
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
    'sodipodi:docname': `${name}.svg`,
  })}>`);
  out.push(`<title id="title${svgId + 1}">${escapeXml(doc.title)}</title>`);
  out.push(`<metadata id="metadata${svgId + 2}"><rdf:RDF>`);
  out.push('<cc:Work rdf:about="">');
  out.push('<dc:format>image/svg+xml</dc:format>');
  out.push('<dc:type rdf:resource="http://purl.org/dc/dcmitype/StillImage" />');
  out.push(`<dc:title>${escapeXml(doc.title)}</dc:title>`);
  out.push(`<dc:date>${escapeXml(doc.metas.date)}</dc:date>`);
  out.push(agent('creator', doc.metas.creator));
  out.push(agent('rights', doc.metas.rights));
  out.push(agent('publisher', doc.metas.publisher));
  for (const field of ['identifier', 'source', 'relation', 'language']) {
    out.push(`<dc:${field}>${escapeXml(doc.metas[field])}</dc:${field}>`);
  }
  out.push(`<dc:subject><rdf:Bag><rdf:li>${escapeXml(doc.metas.keywords)}</rdf:li></rdf:Bag></dc:subject>`);
  out.push(`<dc:coverage>${escapeXml(doc.metas.coverage)}</dc:coverage>`);
  out.push(`<dc:description>${escapeXml(doc.description)}</dc:description>`);
  out.push(agent('contributor', doc.metas.contributors));
  out.push(`<cc:license${attrs({ 'rdf:resource': licenseUrl })} />`);
  out.push('</cc:Work>');
  if (permits.length) {
    out.push(`<cc:License${attrs({ 'rdf:about': licenseUrl })}>`);
    for (const permit of permits) {
      const [what, state] = permit.split(':');
      out.push(`<cc:${state} rdf:resource="http://creativecommons.org/ns#${what}" />`);
    }
    out.push('</cc:License>');
  }
  out.push('</rdf:RDF></metadata>');
  out.push(`<defs id="defs${svgId + 3}" />`);
  out.push(`<image${attrs({
    width,
    height,
    preserveAspectRatio: 'none',
    'xlink:href': `data:image/jpeg;base64,${jpegBase64}`,
    id: `image${svgId + 6}`,
  })}>`);
  out.push(`<desc id="desc${svgId + 7}">${escapeXml(doc.image.description)}</desc>`);
  out.push(`<title id="title${svgId + 8}">${escapeXml(doc.image.title)}</title>`);
  out.push('</image>');

  for (const detail of doc.details.filter(isComplete)) {
    const id = svgId + detail.tag;
    const box = bounds(detail.points);
    const n = roundCoord;
    let element = 'path';
    let geometry;
    if (detail.shape === SHAPE_RECTANGLE) {
      element = 'rect';
      geometry = { id: `rect${id}`, width: n(box.w), height: n(box.h), x: n(box.x), y: n(box.y) };
    } else if (detail.shape === SHAPE_ELLIPSE) {
      element = 'ellipse';
      geometry = {
        id: `path${id}`,
        cx: n(box.x + box.w / 2),
        cy: n(box.y + box.h / 2),
        rx: n(box.w / 2),
        ry: n(box.h / 2),
      };
    } else {
      geometry = {
        id: `path${id}`,
        d: `M ${detail.points.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')} Z`,
        'inkscape:connector-curvature': '0',
      };
    }
    out.push(`<${element}${attrs({ style: DETAIL_STYLE, ...geometry })}>`);
    out.push(`<desc id="desc${id + 100}">${escapeXml(detail.description)}</desc>`);
    out.push(`<title id="title${id + 200}">${escapeXml(detail.title)}</title>`);
    out.push(`</${element}>`);
  }
  out.push('</svg>', '');
  return out.join('\n');
}

/**
 * Tiny bundler: turn a list of ES modules (named imports and exports only,
 * one import per line) into a single classic script.
 */
export function bundleModules(modules, entry) {
  const parts = modules.map(({ name, code }) => {
    const exported = [];
    const body = code
      .replace(/^import\s+\{([^}]+)\}\s+from\s+'\.\/([\w.-]+)';?[ \t]*$/gm, (match, names, file) => (
        `const {${names}} = modules['${file}'];`
      ))
      .replace(/^export\s+(async\s+function|function|const|let|class)\s+([\w$]+)/gm, (match, kind, id) => {
        exported.push(id);
        return `${kind} ${id}`;
      });
    return `modules['${name}'] = (function () {\n${body}\nreturn { ${exported.join(', ')} };\n})();`;
  });
  return `(function () {\n'use strict';\nconst modules = {};\n${parts.join('\n')}\n${entry}\n})();`;
}

/** JSON that can be safely embedded in a <script> element. */
export function scriptJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Self-contained HTML page: the image, the details and the player in one file
 * that works offline and can be published on any web server or LMS.
 */
export function toStandaloneHtml({ doc, imageDataUrl, css, script, strings, lang }) {
  // The read-only code is useless in a viewer and must not leak.
  const data = { doc: { ...doc, readonly: false, code: '' }, image: imageDataUrl, strings };
  const csp = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; "
    + 'img-src data: https:; media-src https:; frame-src https:; base-uri \'none\'; form-action \'none\'';
  return `<!DOCTYPE html>
<html lang="${escapeXml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="generator" content="Xia Express Web">
<title>${escapeXml(doc.title || 'Xia Express')}</title>
<style>
html, body { margin: 0; height: 100%; }
${css}
</style>
</head>
<body>
<script type="application/json" id="xia-data">${scriptJson(data)}</script>
<script>
${script.replace(/<\/script/gi, '<\\/script')}
</script>
</body>
</html>
`;
}

/**
 * Read back a page produced by toStandaloneHtml. The document is returned
 * unvalidated. The page is not parsed as HTML: the embedded JSON never
 * contains "<", so its script element can be located safely in the text.
 */
export function parseStandaloneHtml(htmlText) {
  const match = String(htmlText).match(/<script type="application\/json" id="xia-data">([^<]*)<\/script>/);
  if (!match) {
    throw new Error('Not a Xia Express HTML file');
  }
  const data = JSON.parse(match[1]);
  if (!data || typeof data.image !== 'string' || !/^data:image\/(?:jpeg|png|webp|gif);base64,/.test(data.image)) {
    throw new Error('Not a Xia Express HTML file');
  }
  return { raw: data.doc, imageDataUrl: data.image };
}
