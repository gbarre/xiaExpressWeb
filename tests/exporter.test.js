import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  bundleModules, escapeXml, exportName, parseStandaloneHtml, scriptJson, toInkscapeSvg, toStandaloneHtml, toXiaXml,
} from '../js/exporter.js';
import { newDocument } from '../js/model.js';

function sampleDocument() {
  const doc = newDocument({ title: 'Mon <image> & "test"', width: 800, height: 600 });
  doc.description = 'Une **description**';
  doc.metas.creator = 'Guillaume';
  doc.code = '1234';
  doc.details.push(
    {
      tag: 100, shape: 'rectangle', points: [[10, 20], [110, 20], [110, 70], [10, 70]],
      title: 'Rect <1>', description: 'a < b', zoom: true, locked: false, hidden: true,
    },
    {
      tag: 101, shape: 'ellipse', points: [[60, 20], [110, 45], [60, 70], [10, 45]],
      title: 'Ellipse', description: '', zoom: false, locked: true, hidden: false,
    },
    {
      tag: 102, shape: 'polygon', points: [[0, 0], [50.123, 0], [25, 40]],
      title: 'Poly', description: '', zoom: true, locked: false, hidden: false,
    },
    { tag: 103, shape: 'polygon', points: [[0, 0]], title: 'Incomplete', description: '' },
  );
  return doc;
}

test('escapeXml', () => {
  assert.equal(escapeXml('a<b>&"c"\u0000'), 'a&lt;b&gt;&amp;&quot;c&quot;');
});

test('Xia Express XML export', () => {
  const xml = toXiaXml(sampleDocument(), 'QUJD');
  assert.match(xml, /^<\?xml version="1\.0"/);
  assert.match(xml, /<xia syntax="markdown">/);
  assert.match(xml, /<title>Mon &lt;image&gt; &amp; &quot;test&quot;<\/title>/);
  assert.match(xml, /<readonly code="1234">false<\/readonly>/);
  assert.match(xml, /<details show="true">/);
  assert.match(xml, /<detail tag="100" zoom="true" locked="false" hidden="true" title="Rect &lt;1&gt;" path="10;20 110;20 110;70 10;70" constraint="rectangle">a &lt; b<\/detail>/);
  assert.match(xml, /path="0;0 50\.12;0 25;40" constraint="polygon"/);
  assert.doesNotMatch(xml, /Incomplete/);
  assert.match(xml, /<image>QUJD<\/image>\n<\/XiaiPad>\n$/);
});

test('Inkscape SVG export', () => {
  const svg = toInkscapeSvg(sampleDocument(), 'QUJD', 2000);
  assert.match(svg, /<svg [^>]*id="svg2000"[^>]*width="800" height="600" viewBox="0 0 800 600"/);
  assert.match(svg, /xlink:href="data:image\/jpeg;base64,QUJD"/);
  assert.match(svg, /<rect style="[^"]+" id="rect2100" width="100" height="50" x="10" y="20">/);
  assert.match(svg, /<ellipse style="[^"]+" id="path2101" cx="60" cy="45" rx="50" ry="25">/);
  assert.match(svg, /<path style="[^"]+" id="path2102" d="M 0,0 50\.12,0 25,40 Z"/);
  assert.match(svg, /<title id="title2300">Rect &lt;1&gt;<\/title>/);
  assert.match(svg, /<cc:license rdf:resource="http:\/\/creativecommons\.org\/licenses\/by-nc\/3\.0\/" \/>/);
  assert.match(svg, /<cc:prohibits rdf:resource="http:\/\/creativecommons\.org\/ns#CommercialUse" \/>/);
  assert.equal((svg.match(/<svg /g) || []).length, 1);
});

test('export file name', () => {
  assert.equal(exportName(sampleDocument()), 'Mon_image__test');
  const untitled = newDocument({ width: 1, height: 1 });
  assert.match(exportName(untitled), /^xia-[0-9a-f]{8}$/);
});

test('scriptJson cannot close the script element', () => {
  const json = scriptJson({ text: '</script><script>alert(1)</script><!--' });
  assert.doesNotMatch(json, /[<>]/);
  assert.deepEqual(JSON.parse(json), { text: '</script><script>alert(1)</script><!--' });
});

test('bundleModules turns the player modules into one classic script', async () => {
  const names = ['shapes.js', 'markdown.js', 'player.js'];
  const modules = await Promise.all(names.map(async (name) => ({
    name,
    code: await readFile(new URL(`../js/${name}`, import.meta.url), 'utf8'),
  })));
  const script = bundleModules(modules, 'globalThis.bundled = modules;');
  assert.doesNotMatch(script, /^\s*(?:import|export)\s/m);
  // The bundle must be valid JavaScript and expose the expected functions.
  new Function(script)();
  assert.equal(typeof globalThis.bundled['player.js'].mountPlayer, 'function');
  assert.equal(typeof globalThis.bundled['player.js'].bootStandalone, 'function');
  assert.equal(globalThis.bundled['markdown.js'].renderMarkdown('**ok**'), '<p><strong>ok</strong></p>');
  delete globalThis.bundled;
});

test('standalone HTML export', () => {
  const doc = sampleDocument();
  doc.readonly = true;
  const html = toStandaloneHtml({
    doc,
    imageDataUrl: 'data:image/jpeg;base64,QUJD',
    css: '.xia-player{}',
    script: 'var a = "</script>";',
    strings: { close: 'Fermer' },
    lang: 'fr',
  });
  assert.match(html, /^<!DOCTYPE html>\n<html lang="fr">/);
  assert.match(html, /<title>Mon &lt;image&gt; &amp; &quot;test&quot;<\/title>/);
  assert.match(html, /Content-Security-Policy/);
  // The read-only code never leaves the application.
  assert.doesNotMatch(html, /1234/);
  assert.equal((html.match(/<\/script>/g) || []).length, 2);

  const parsed = parseStandaloneHtml(html);
  assert.equal(parsed.imageDataUrl, 'data:image/jpeg;base64,QUJD');
  assert.equal(parsed.raw.title, doc.title);
  assert.equal(parsed.raw.details.length, doc.details.length);
  assert.throws(() => parseStandaloneHtml('<html></html>'), /Not a Xia Express HTML file/);
});
