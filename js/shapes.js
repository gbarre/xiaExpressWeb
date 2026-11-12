// Geometry helpers shared by the editor, the player and the exporters.
// All coordinates are expressed in image pixels.

export const SHAPE_RECTANGLE = 'rectangle';
export const SHAPE_ELLIPSE = 'ellipse';
export const SHAPE_POLYGON = 'polygon';

/** Round a coordinate to two decimals to keep paths and exports compact. */
export function roundCoord(value) {
  return Math.round(value * 100) / 100;
}

/** Bounding box of a list of [x, y] points. */
export function bounds(points) {
  if (!points.length) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  let xMin = Infinity;
  let yMin = Infinity;
  let xMax = -Infinity;
  let yMax = -Infinity;
  for (const [x, y] of points) {
    xMin = Math.min(xMin, x);
    yMin = Math.min(yMin, y);
    xMax = Math.max(xMax, x);
    yMax = Math.max(yMax, y);
  }
  return { x: xMin, y: yMin, w: xMax - xMin, h: yMax - yMin };
}

/** Four corners of a box: top-left, top-right, bottom-right, bottom-left. */
export function rectanglePoints(box) {
  return [
    [box.x, box.y],
    [box.x + box.w, box.y],
    [box.x + box.w, box.y + box.h],
    [box.x, box.y + box.h],
  ];
}

/** Four cardinal points of the ellipse inscribed in a box: top, right, bottom, left. */
export function ellipsePoints(box) {
  return [
    [box.x + box.w / 2, box.y],
    [box.x + box.w, box.y + box.h / 2],
    [box.x + box.w / 2, box.y + box.h],
    [box.x, box.y + box.h / 2],
  ];
}

/** Canonical points for a constrained shape (rectangle or ellipse). */
export function constrainedPoints(shape, box) {
  return shape === SHAPE_ELLIPSE ? ellipsePoints(box) : rectanglePoints(box);
}

/** SVG path data of a detail. */
export function shapePath(detail) {
  const points = detail.points;
  if (points.length < 2) {
    return '';
  }
  const n = roundCoord;
  if (detail.shape === SHAPE_ELLIPSE) {
    const box = bounds(points);
    const rx = n(box.w / 2);
    const ry = n(box.h / 2);
    return `M ${n(box.x)},${n(box.y + box.h / 2)} `
      + `a ${rx},${ry} 0 1,0 ${n(box.w)},0 `
      + `a ${rx},${ry} 0 1,0 ${n(-box.w)},0 Z`;
  }
  return `M ${points.map(([x, y]) => `${n(x)},${n(y)}`).join(' L ')} Z`;
}

/** Parse the legacy "x1;y1 x2;y2 ..." path attribute. */
export function parsePath(text) {
  const points = [];
  for (const chunk of String(text || '').trim().split(/\s+/)) {
    const coords = chunk.split(';');
    if (coords.length !== 2) {
      continue;
    }
    const x = Number.parseFloat(coords[0].replace(',', '.'));
    const y = Number.parseFloat(coords[1].replace(',', '.'));
    if (Number.isFinite(x) && Number.isFinite(y)) {
      points.push([x, y]);
    }
  }
  return points;
}

/** Serialize points to the legacy "x1;y1 x2;y2 ..." path attribute. */
export function formatPath(points) {
  if (points.length < 2) {
    return '0;0';
  }
  return points.map(([x, y]) => `${roundCoord(x)};${roundCoord(y)}`).join(' ');
}

/** Keep a value inside [min, max]. */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
