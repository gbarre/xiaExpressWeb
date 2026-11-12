import assert from 'node:assert/strict';
import { test } from 'node:test';

import { providerEmbedUrl, renderMarkdown, safeUrl } from '../js/markdown.js';

test('inline formatting', () => {
  assert.equal(renderMarkdown('Un **gras** et un *italique*.'), '<p>Un <strong>gras</strong> et un <em>italique</em>.</p>');
  assert.equal(renderMarkdown('***les deux***'), '<p><strong><em>les deux</em></strong></p>');
  assert.equal(renderMarkdown('~~non~~ `code *brut*`'), '<p><del>non</del> <code>code *brut*</code></p>');
  assert.equal(renderMarkdown('snake_case_name'), '<p>snake_case_name</p>');
  assert.equal(renderMarkdown('\\*pas italique\\*'), '<p>*pas italique*</p>');
});

test('line breaks are kept inside a paragraph', () => {
  assert.equal(renderMarkdown('ligne 1\nligne 2\n\nautre'), '<p>ligne 1<br>\nligne 2</p>\n<p>autre</p>');
});

test('headings, rules, quotes and code blocks', () => {
  assert.equal(renderMarkdown('# Titre\n\n---\n\n> cité'), '<h1>Titre</h1>\n<hr>\n<blockquote>\n<p>cité</p>\n</blockquote>');
  assert.equal(renderMarkdown('```\n<b>&\n```'), '<pre><code>&lt;b&gt;&amp;</code></pre>');
});

test('lists, nested and ordered', () => {
  assert.equal(
    renderMarkdown('- un\n- deux\n  - sous\n- trois'),
    '<ul>\n<li>un</li>\n<li>deux\n<ul>\n<li>sous</li>\n</ul></li>\n<li>trois</li>\n</ul>',
  );
  assert.equal(renderMarkdown('3. a\n4. b'), '<ol start="3">\n<li>a</li>\n<li>b</li>\n</ol>');
  assert.equal(renderMarkdown('texte\n- item'), '<p>texte</p>\n<ul>\n<li>item</li>\n</ul>');
});

test('links', () => {
  assert.equal(
    renderMarkdown('[Xia](https://xia.example/a_b_c "Site")'),
    '<p><a href="https://xia.example/a_b_c" title="Site" target="_blank" rel="noopener noreferrer">Xia</a></p>',
  );
  assert.match(renderMarkdown('voir https://example.org/page.'), /href="https:\/\/example\.org\/page"[^>]*>https:\/\/example\.org\/page<\/a>\.<\/p>$/);
  assert.match(renderMarkdown('<https://example.org>'), /<a href="https:\/\/example\.org"/);
});

test('media', () => {
  assert.equal(
    renderMarkdown('![Une photo](https://example.org/p.jpg)'),
    '<p><img src="https://example.org/p.jpg" alt="Une photo" loading="lazy"></p>',
  );
  assert.match(renderMarkdown('https://example.org/son.mp3'), /<audio controls preload="none" src="https:\/\/example\.org\/son\.mp3">/);
  assert.match(renderMarkdown('https://example.org/film.webm?x=1'), /<video controls/);
  assert.match(renderMarkdown('https://youtu.be/abcdefghijk'), /^<div class="xia-embed"><iframe src="https:\/\/www\.youtube-nocookie\.com\/embed\/abcdefghijk"/);
  // Provider pages are only embedded when alone on their line.
  assert.doesNotMatch(renderMarkdown('voir https://youtu.be/abcdefghijk ici'), /iframe/);
});

test('provider embed URLs', () => {
  assert.equal(providerEmbedUrl('https://www.youtube.com/watch?v=abcdefghijk&t=3'), 'https://www.youtube-nocookie.com/embed/abcdefghijk');
  assert.equal(providerEmbedUrl('https://vimeo.com/123456'), 'https://player.vimeo.com/video/123456');
  assert.equal(
    providerEmbedUrl('https://tube.example.fr/w/9c9de5e8-0a1e-484a-b099-e80766180a6d'),
    'https://tube.example.fr/videos/embed/9c9de5e8-0a1e-484a-b099-e80766180a6d',
  );
  assert.equal(providerEmbedUrl('http://www.youtube.com/watch?v=abcdefghijk'), null);
  assert.equal(providerEmbedUrl('https://example.org/page'), null);
});

test('untrusted input cannot inject markup', () => {
  const payloads = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '[clic](javascript:alert(1))',
    '![x](javascript:alert(1))',
    '[clic](data:text/html,<script>alert(1)</script>)',
    '[x](https://a.example/"onmouseover="alert(1))',
    '![a"onerror="alert(1)](https://a.example/b.png)',
    '<https://a.example/"onclick="alert(1)>',
    'https://a.example/x.png"onerror="alert(1)',
    '`<b>`',
    '\uE0000\uE001',
  ];
  for (const payload of payloads) {
    const html = renderMarkdown(payload);
    // No attribute other than the ones the renderer writes itself.
    assert.doesNotMatch(html, /<[^>]*\son\w+=/i, payload);
    assert.doesNotMatch(html, /<(?:script|b)\b/i, payload);
    assert.doesNotMatch(html, /(?:href|src)="(?!https?:\/\/|mailto:)/i, payload);
  }
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl(' https://ok.example/a '), 'https://ok.example/a');
});
