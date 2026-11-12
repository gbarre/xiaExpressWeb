import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cleanFileName, newDetail, newDocument, nextTag, sanitizeDocument } from '../js/model.js';
import { bounds, formatPath, parsePath, shapePath } from '../js/shapes.js';
import { pikipikiToMarkdown } from '../js/legacy.js';
import { renderMarkdown } from '../js/markdown.js';

test('legacy path round trip', () => {
  const points = parsePath('100;30 300,5;30 300;150.25 100;150');
  assert.deepEqual(points, [[100, 30], [300.5, 30], [300, 150.25], [100, 150]]);
  assert.equal(formatPath(points), '100;30 300.5;30 300;150.25 100;150');
  assert.deepEqual(parsePath('0;0'), [[0, 0]]);
  assert.deepEqual(parsePath('garbage 1;x'), []);
});

test('shape paths', () => {
  const rectangle = { shape: 'rectangle', points: [[10, 20], [110, 20], [110, 70], [10, 70]] };
  assert.equal(shapePath(rectangle), 'M 10,20 L 110,20 L 110,70 L 10,70 Z');
  const ellipse = { shape: 'ellipse', points: [[60, 20], [110, 45], [60, 70], [10, 45]] };
  assert.equal(shapePath(ellipse), 'M 10,45 a 50,25 0 1,0 100,0 a 50,25 0 1,0 -100,0 Z');
  assert.deepEqual(bounds(ellipse.points), { x: 10, y: 20, w: 100, h: 50 });
});

test('new documents and details', () => {
  const doc = newDocument({ title: 'Test', width: 1000, height: 500 });
  assert.equal(nextTag(doc), 100);
  const rectangle = newDetail(doc, 'rectangle');
  doc.details.push(rectangle);
  assert.deepEqual(bounds(rectangle.points), { x: 350, y: 175, w: 300, h: 150 });
  assert.equal(newDetail(doc, 'polygon').tag, 101);
  assert.equal(rectangle.zoom, true);
  assert.equal(rectangle.hidden, false);
});

test('sanitizeDocument drops what it does not know and repairs the rest', () => {
  const doc = sanitizeDocument({
    title: 42,
    evil: '<script>',
    readonly: 'true',
    image: { width: 200, height: 100, title: 'Fond' },
    metas: { creator: 'Moi', unknown: 'x', license: 7 },
    details: [
      { tag: 100, shape: 'rectangle', points: [[0, 0], [500, 0], [500, 50], [0, 50]], title: 'A' },
      { tag: 100, shape: 'ellipse', points: [[1, 1], [2, 2], [3, 1]], zoom: false },
      { tag: 5, shape: 'nope', points: [[1, 1], ['x', 2]] },
      'garbage',
    ],
  });
  assert.equal(doc.title, '');
  assert.equal(doc.evil, undefined);
  assert.equal(doc.readonly, false);
  assert.equal(doc.image.title, 'Fond');
  assert.equal(doc.metas.creator, 'Moi');
  assert.equal(doc.metas.unknown, undefined);
  assert.equal(doc.details.length, 2);
  // Points are clamped to the image, duplicate tags are renumbered.
  assert.deepEqual(bounds(doc.details[0].points), { x: 0, y: 0, w: 200, h: 50 });
  assert.equal(doc.details[1].tag, 101);
  // An "ellipse" that does not have four points becomes a polygon.
  assert.equal(doc.details[1].shape, 'polygon');
  assert.equal(doc.details[1].zoom, false);
});

test('cleanFileName', () => {
  assert.equal(cleanFileName('Le château d’If (été)'), 'Le_chateau_dIf_ete');
  assert.equal(cleanFileName('', 'xia'), 'xia');
  assert.equal(cleanFileName('a'.repeat(80)).length, 45);
});

test('legacy wiki syntax is converted to Markdown', () => {
  const legacy = [
    'Un ***gras*** et un **italique**.',
    '----',
    '* un',
    ' * sous',
    '* deux',
    '[https://example.org Le site] et [https://example.org/seul]',
    '{{{code}}}',
  ].join('\n');
  assert.equal(pikipikiToMarkdown(legacy), [
    'Un **gras** et un *italique*.',
    '',
    '---',
    '',
    '- un',
    '  - sous',
    '- deux',
    '[Le site](https://example.org) et <https://example.org/seul>',
    '`code`',
  ].join('\n'));
  const html = renderMarkdown(pikipikiToMarkdown(legacy));
  assert.match(html, /<strong>gras<\/strong>/);
  assert.match(html, /<hr>/);
  assert.match(html, /<li>un\n<ul>\n<li>sous<\/li>/);
  assert.equal(pikipikiToMarkdown(''), '');
});
