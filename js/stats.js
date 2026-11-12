// Anonymous usage statistics sent to a Matomo instance.
//
// Privacy by design: no cookie, no identifier, no third-party script. Only
// the name of the screen and a few named actions are sent, never the content,
// the title or the identifier of a document. Nothing is sent when the browser
// asks not to be tracked, nor from a development machine.

import { CONFIG } from './config.js';

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]', ''];

function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/** True when the configuration describes a usable Matomo instance. */
export function statsConfigured(config = CONFIG) {
  return Boolean(httpsUrl(config.matomoUrl)) && Number.isInteger(config.matomoSiteId) && config.matomoSiteId > 0;
}

/**
 * Address of a Matomo tracking request (HTTP Tracking API).
 * `hit` is either { view } or { category, action, name }.
 */
export function trackingUrl(config, pageUrl, hit, random = Math.random()) {
  const url = new URL('matomo.php', httpsUrl(config.matomoUrl));
  const params = {
    idsite: config.matomoSiteId,
    rec: 1,
    apiv: 1,
    rand: Math.floor(random * 1e9),
    url: pageUrl,
  };
  if (hit.view) {
    params.action_name = hit.view;
  } else {
    params.e_c = hit.category;
    params.e_a = hit.action;
    if (hit.name) {
      params.e_n = hit.name;
    }
  }
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  return url.href;
}

function allowed() {
  if (!statsConfigured() || LOCAL_HOSTS.includes(location.hostname)) {
    return false;
  }
  return navigator.doNotTrack !== '1' && navigator.globalPrivacyControl !== true;
}

function send(screen, hit) {
  if (!allowed()) {
    return;
  }
  // The address reported never contains a document identifier.
  const base = new URL('.', location.href).href;
  // An image request needs no extra permission in the content security policy.
  new Image().src = trackingUrl(CONFIG, screen ? `${base}${screen}` : base, hit);
}

let currentScreen = '';

/** Record the display of a screen: '' (collection), 'edit' or 'play'. */
export function trackView(screen, title) {
  currentScreen = screen;
  send(screen, { view: title });
}

/** Record a named action, for example ('export', 'html'). */
export function trackEvent(category, action, name) {
  send(currentScreen, { category, action, name });
}
