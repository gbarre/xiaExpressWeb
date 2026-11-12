import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { LANGUAGES, stringsOf } from '../js/i18n.js';

test('every language defines the same keys', () => {
  const reference = Object.keys(stringsOf('fr')).sort();
  for (const lang of LANGUAGES) {
    assert.deepEqual(Object.keys(stringsOf(lang)).sort(), reference, lang);
  }
});

test('every key used in the code is translated', async () => {
  const directory = new URL('../js/', import.meta.url);
  const known = new Set(Object.keys(stringsOf('fr')));
  for (const file of await readdir(directory)) {
    const source = await readFile(new URL(file, directory), 'utf8');
    for (const match of source.matchAll(/\bt\('([\w.]+)'/g)) {
      assert.ok(known.has(match[1]), `${file}: missing translation "${match[1]}"`);
    }
  }
});
