import assert from 'node:assert/strict';
import { test } from 'node:test';

import { statsConfigured, trackingUrl } from '../js/stats.js';

const config = { matomoUrl: 'https://stats.example.org/matomo/', matomoSiteId: 7 };

test('statistics are only enabled by a complete HTTPS configuration', () => {
  assert.equal(statsConfigured(config), true);
  assert.equal(statsConfigured({ matomoUrl: '', matomoSiteId: 0 }), false);
  assert.equal(statsConfigured({ matomoUrl: 'https://stats.example.org/', matomoSiteId: 0 }), false);
  assert.equal(statsConfigured({ matomoUrl: 'http://stats.example.org/', matomoSiteId: 1 }), false);
  assert.equal(statsConfigured({ matomoUrl: 'javascript:alert(1)', matomoSiteId: 1 }), false);
});

test('page view request', () => {
  const url = new URL(trackingUrl(config, 'https://xia.example.org/edit', { view: 'Editor' }, 0.5));
  assert.equal(url.origin + url.pathname, 'https://stats.example.org/matomo/matomo.php');
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    idsite: '7',
    rec: '1',
    apiv: '1',
    rand: '500000000',
    url: 'https://xia.example.org/edit',
    action_name: 'Editor',
  });
});

test('event request', () => {
  const url = new URL(trackingUrl(config, 'https://xia.example.org/', { category: 'export', action: 'html' }, 0));
  assert.equal(url.searchParams.get('e_c'), 'export');
  assert.equal(url.searchParams.get('e_a'), 'html');
  assert.equal(url.searchParams.has('e_n'), false);
  assert.equal(url.searchParams.has('action_name'), false);
});
