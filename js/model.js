// Document model: creation, validation and small pure helpers.

import { SHAPE_ELLIPSE, SHAPE_POLYGON, SHAPE_RECTANGLE, bounds, clamp, constrainedPoints } from './shapes.js';

export const FORMAT_VERSION = 1;
export const FIRST_TAG = 100;
export const DEFAULT_LICENSE = 'CC Attribution-NonCommercial - CC-BY-NC';

// Dublin Core fields, in the order used by the legacy applications.
export const META_FIELDS = [
  'creator', 'rights', 'publisher', 'identifier', 'source', 'date',
  'language', 'keywords', 'contributors', 'relation', 'coverage', 'license',
];

export const LICENSES = [
  'Proprietary - CC-Zero',
  'CC Attribution - CC-BY',
  'CC Attribution-ShareALike - CC-BY-SA',
  'CC Attribution-NoDerivs - CC-BY-ND',
  'CC Attribution-NonCommercial - CC-BY-NC',
  'CC Attribution-NonCommercial-ShareALike - CC-BY-NC-SA',
  'CC Attribution-NonCommercial-NoDerivs - CC-BY-NC-ND',
  'CC0 Public Domain Dedication',
  'Free Art',
  'Open Font License',
  'Other',
];

const SHAPES = [SHAPE_RECTANGLE, SHAPE_ELLIPSE, SHAPE_POLYGON];
const MAX_TEXT = 100000;

function text(value, max = MAX_TEXT) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

/** Random identifier. crypto.randomUUID is not available on plain HTTP origins. */
export function newId() {
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function newDocument({ title = '', width, height }) {
  const metas = Object.fromEntries(META_FIELDS.map((field) => [field, '']));
  metas.license = DEFAULT_LICENSE;
  metas.date = todayIso();
  return {
    version: FORMAT_VERSION,
    id: newId(),
    title,
    description: '',
    readonly: false,
    code: '',
    metas,
    image: { title: '', description: '', width, height },
    details: [],
  };
}

export function nextTag(doc) {
  return doc.details.reduce((max, detail) => Math.max(max, detail.tag + 1), FIRST_TAG);
}

/** Create a detail. Rectangles and ellipses start centered on the image. */
export function newDetail(doc, shape) {
  const { width, height } = doc.image;
  const box = { x: width * 0.35, y: height * 0.35, w: width * 0.3, h: height * 0.3 };
  return {
    tag: nextTag(doc),
    shape,
    points: shape === SHAPE_POLYGON ? [] : constrainedPoints(shape, box),
    title: '',
    description: '',
    zoom: true,
    locked: false,
    hidden: false,
  };
}

/** Details that can be displayed: at least three points. */
export function isComplete(detail) {
  return detail.points.length >= 3;
}

/**
 * Rebuild a document from untrusted data (imported files, older versions).
 * Unknown properties are dropped and every value is coerced to its type.
 */
export function sanitizeDocument(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const image = source.image && typeof source.image === 'object' ? source.image : {};
  const width = positive(image.width, 1);
  const height = positive(image.height, 1);
  const doc = newDocument({ title: text(source.title, 500), width, height });
  doc.description = text(source.description);
  doc.readonly = source.readonly === true;
  doc.code = text(source.code, 64);
  doc.image.title = text(image.title, 500);
  doc.image.description = text(image.description);
  const metas = source.metas && typeof source.metas === 'object' ? source.metas : {};
  for (const field of META_FIELDS) {
    if (typeof metas[field] === 'string') {
      doc.metas[field] = text(metas[field], 2000);
    }
  }

  const used = new Set();
  const details = Array.isArray(source.details) ? source.details : [];
  for (const item of details) {
    if (!item || typeof item !== 'object' || !Array.isArray(item.points)) {
      continue;
    }
    let points = item.points
      .filter((point) => Array.isArray(point) && point.length >= 2)
      .map((point) => [Number(point[0]), Number(point[1])])
      .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
      .map(([x, y]) => [clamp(x, 0, width), clamp(y, 0, height)]);
    if (points.length < 3) {
      continue;
    }
    let shape = SHAPES.includes(item.shape) ? item.shape : SHAPE_POLYGON;
    if (shape !== SHAPE_POLYGON) {
      // Constrained shapes are always stored as four canonical points.
      if (points.length === 4) {
        points = constrainedPoints(shape, bounds(points));
      } else {
        shape = SHAPE_POLYGON;
      }
    }
    let tag = Number.isInteger(item.tag) && item.tag > 0 ? item.tag : 0;
    if (!tag || used.has(tag)) {
      tag = Math.max(FIRST_TAG - 1, ...used) + 1;
    }
    used.add(tag);
    doc.details.push({
      tag,
      shape,
      points,
      title: text(item.title, 500),
      description: text(item.description),
      zoom: item.zoom !== false,
      locked: item.locked === true,
      hidden: item.hidden === true,
    });
  }
  return doc;
}

/** File name derived from a title: no spaces, no special characters, 45 characters at most. */
export function cleanFileName(title, fallback = 'xia') {
  const cleaned = String(title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^\w.-]/g, '')
    .slice(0, 45);
  return cleaned || fallback;
}
