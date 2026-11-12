// Minimal, dependency-free Markdown renderer.
// Security model: the source is never trusted. Every piece of text is HTML
// escaped, URLs are restricted to http(s) and mailto, and the only tags that
// can be produced are the ones written in this file.

const STASH_OPEN = '\uE000';
const STASH_CLOSE = '\uE001';
const STASH_RE = /\uE000(\d+)\uE001/g;
const STASH_CHARS_RE = /[\uE000\uE001]/g;

const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const IMAGE_EXT_RE = /\.(?:jpe?g|png|gif|webp|avif)$/i;
const AUDIO_EXT_RE = /\.(?:mp3|ogg|oga|m4a|wav|opus|flac)$/i;
const VIDEO_EXT_RE = /\.(?:mp4|webm|ogv|m4v)$/i;

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})\s*[\w+-]*\s*$/;
const HEADING_RE = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE_RE = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE_RE = /^ {0,3}>\s?/;
const LIST_RE = /^( *)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const URL_ONLY_RE = /^\s*<?(https?:\/\/[^\s<>]+)>?\s*$/i;

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);
}

/** Return the URL when its scheme is allowed, null otherwise. */
export function safeUrl(url) {
  const value = String(url || '').trim();
  return /^(?:https?:\/\/|mailto:)[^\s<>"]+$/i.test(value) ? value : null;
}

function pathOf(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

function linkHtml(url, labelHtml, title) {
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
  return `<a href="${escapeHtml(url)}"${titleAttr} target="_blank" rel="noopener noreferrer">${labelHtml}</a>`;
}

/** HTML for a direct link to an image, audio or video file, null otherwise. */
export function mediaFileHtml(url, alt = '') {
  const safe = safeUrl(url);
  if (!safe || !/^https?:/i.test(safe)) {
    return null;
  }
  const path = pathOf(safe);
  const src = escapeHtml(safe);
  if (IMAGE_EXT_RE.test(path)) {
    return `<img src="${src}" alt="${escapeHtml(alt)}" loading="lazy">`;
  }
  if (AUDIO_EXT_RE.test(path)) {
    return `<audio controls preload="none" src="${src}"></audio>`;
  }
  if (VIDEO_EXT_RE.test(path)) {
    return `<video controls preload="metadata" src="${src}"></video>`;
  }
  return null;
}

/** Embeddable player URL for a known video provider page, null otherwise. */
export function providerEmbedUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') {
    return null;
  }
  const host = parsed.hostname.replace(/^(?:www|m)\./, '');
  const path = parsed.pathname;
  let match;
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = path === '/watch'
      ? parsed.searchParams.get('v')
      : (path.match(/^\/(?:embed|shorts|live)\/([\w-]{6,})/) || [])[1];
    return id && /^[\w-]{6,}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'youtu.be') {
    match = path.match(/^\/([\w-]{6,})/);
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : null;
  }
  if (host === 'vimeo.com') {
    match = path.match(/^\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}` : null;
  }
  if (host === 'dailymotion.com') {
    match = path.match(/^\/video\/([a-z0-9]+)/i);
    return match ? `https://www.dailymotion.com/embed/video/${match[1]}` : null;
  }
  // PeerTube instances (any host) use /w/<id> or /videos/watch/<id>.
  match = path.match(/^\/(?:w|videos\/watch)\/([\w-]{8,})$/);
  if (match) {
    return `https://${parsed.host}/videos/embed/${match[1]}`;
  }
  return null;
}

function embedHtml(url) {
  const embed = providerEmbedUrl(url);
  if (!embed) {
    return null;
  }
  return '<div class="xia-embed"><iframe'
    + ` src="${escapeHtml(embed)}"`
    + ' loading="lazy" allowfullscreen'
    + ' referrerpolicy="strict-origin-when-cross-origin"'
    + ' sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"'
    + '></iframe></div>';
}

function renderInline(source, stash, allowLinks = true) {
  const keep = (html) => {
    stash.push(html);
    return `${STASH_OPEN}${stash.length - 1}${STASH_CLOSE}`;
  };
  let text = source;

  // Code spans first: their content is literal.
  text = text.replace(/(`+)(?!`)([\s\S]*?[^`])\1(?!`)/g, (match, ticks, code) => (
    keep(`<code>${escapeHtml(code.trim())}</code>`)
  ));
  // Backslash escapes.
  text = text.replace(/\\([\\`*_{}[\]()#+\-.!~>|<])/g, (match, char) => keep(escapeHtml(char)));

  if (allowLinks) {
    // Images: ![alt](url "title")
    text = text.replace(/!\[([^\]]*)\]\(\s*([^\s)]+)(?:\s+"([^"]*)")?\s*\)/g, (match, alt, url) => {
      const safe = safeUrl(url);
      if (!safe || !/^https?:/i.test(safe)) {
        return match;
      }
      return keep(`<img src="${escapeHtml(safe)}" alt="${escapeHtml(alt)}" loading="lazy">`);
    });
    // Links: [label](url "title")
    text = text.replace(/\[([^\]]+)\]\(\s*([^\s)]+)(?:\s+"([^"]*)")?\s*\)/g, (match, label, url, title) => {
      const safe = safeUrl(url);
      if (!safe) {
        return match;
      }
      return keep(linkHtml(safe, renderInline(label, stash, false), title));
    });
    // Autolinks: <https://example.org>
    text = text.replace(/<((?:https?:\/\/|mailto:)[^\s<>]+)>/gi, (match, url) => {
      const safe = safeUrl(url);
      return safe ? keep(linkHtml(safe, escapeHtml(safe.replace(/^mailto:/i, '')))) : match;
    });
    // Bare URLs. Direct links to media files are displayed inline.
    text = text.replace(/(^|[\s(])(https?:\/\/[^\s<>]*[^\s<>.,;:!?)\]'"])/gi, (match, before, url) => {
      const safe = safeUrl(url);
      if (!safe) {
        return match;
      }
      return before + keep(mediaFileHtml(safe) || linkHtml(safe, escapeHtml(safe)));
    });
  }

  text = escapeHtml(text);

  return text
    .replace(/\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, '$1<strong>$2</strong>')
    .replace(/\*(?=\S)([^*]*?\S)\*/g, '<em>$1</em>')
    .replace(/(^|[^\w])_(?=\S)([^_]*?\S)_(?!\w)/g, '$1<em>$2</em>')
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>');
}

function isBlockStart(line) {
  return FENCE_RE.test(line) || HEADING_RE.test(line) || RULE_RE.test(line)
    || QUOTE_RE.test(line) || LIST_RE.test(line);
}

function isOrdered(marker) {
  return /\d/.test(marker);
}

function renderList(lines, start, stash) {
  const first = lines[start].match(LIST_RE);
  const baseIndent = first[1].length;
  const ordered = isOrdered(first[2]);
  const items = [];
  let index = start;

  while (index < lines.length) {
    const match = lines[index].match(LIST_RE);
    if (!match || match[1].length > baseIndent + 1 || match[1].length < baseIndent
      || isOrdered(match[2]) !== ordered || RULE_RE.test(lines[index])) {
      break;
    }
    const contentIndent = match[1].length + match[2].length + 1;
    const itemLines = [match[3]];
    let loose = false;
    index += 1;
    while (index < lines.length) {
      const line = lines[index];
      const indent = line.match(/^ */)[0].length;
      if (!line.trim()) {
        // A blank line only belongs to the item when indented content follows.
        let next = index + 1;
        while (next < lines.length && !lines[next].trim()) {
          next += 1;
        }
        if (next >= lines.length || lines[next].match(/^ */)[0].length < baseIndent + 2) {
          break;
        }
        loose = true;
        itemLines.push('');
        index += 1;
      } else if (indent >= baseIndent + 2) {
        itemLines.push(line.slice(Math.min(indent, contentIndent)));
        index += 1;
      } else if (!isBlockStart(line) && itemLines[itemLines.length - 1] !== '') {
        // Lazy continuation of the current paragraph.
        itemLines.push(line.trim());
        index += 1;
      } else {
        break;
      }
    }
    let html = renderBlocks(itemLines, stash);
    if (!loose) {
      html = html.replace(/^<p>([\s\S]*?)<\/p>/, '$1');
    }
    items.push(`<li>${html}</li>`);
    // Skip blank lines between two items of the same list.
    let next = index;
    while (next < lines.length && !lines[next].trim()) {
      next += 1;
    }
    const nextMatch = next < lines.length ? lines[next].match(LIST_RE) : null;
    if (next > index && nextMatch && nextMatch[1].length === baseIndent
      && isOrdered(nextMatch[2]) === ordered) {
      index = next;
    }
  }

  const tag = ordered ? 'ol' : 'ul';
  const startNumber = ordered ? Number.parseInt(first[2], 10) : 1;
  const startAttr = ordered && startNumber !== 1 ? ` start="${startNumber}"` : '';
  return { html: `<${tag}${startAttr}>\n${items.join('\n')}\n</${tag}>`, next: index };
}

function renderBlocks(lines, stash) {
  const out = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(FENCE_RE);
    if (fence) {
      const closing = new RegExp(`^ {0,3}${fence[1][0]}{${fence[1].length},}\\s*$`);
      const code = [];
      index += 1;
      while (index < lines.length && !closing.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = line.match(HEADING_RE);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2], stash)}</h${level}>`);
      index += 1;
      continue;
    }

    if (RULE_RE.test(line)) {
      out.push('<hr>');
      index += 1;
      continue;
    }

    if (QUOTE_RE.test(line)) {
      const quoted = [];
      while (index < lines.length && QUOTE_RE.test(lines[index])) {
        quoted.push(lines[index].replace(QUOTE_RE, ''));
        index += 1;
      }
      out.push(`<blockquote>\n${renderBlocks(quoted, stash)}\n</blockquote>`);
      continue;
    }

    if (LIST_RE.test(line)) {
      const list = renderList(lines, index, stash);
      out.push(list.html);
      index = list.next;
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    // A URL alone in its paragraph becomes an embedded player when possible.
    const alone = paragraph.length === 1 ? paragraph[0].match(URL_ONLY_RE) : null;
    const embed = alone ? embedHtml(alone[1]) : null;
    if (embed) {
      out.push(embed);
    } else {
      // Line breaks are kept: authors are not expected to know Markdown rules.
      out.push(`<p>${paragraph.map((text) => renderInline(text.trim(), stash)).join('<br>\n')}</p>`);
    }
  }

  return out.join('\n');
}

/** Convert Markdown source to a safe HTML string. */
export function renderMarkdown(source) {
  const text = String(source || '')
    .replace(STASH_CHARS_RE, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '    ');
  const stash = [];
  let html = renderBlocks(text.split('\n'), stash);
  // Stashed fragments may themselves contain stashed fragments.
  for (let pass = 0; pass < 5 && html.includes(STASH_OPEN); pass += 1) {
    html = html.replace(STASH_RE, (match, id) => stash[Number(id)] ?? '');
  }
  return html;
}
