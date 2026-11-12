// Compatibility with the native Xia Express applications (iOS and Android).
// Their descriptions use a wiki-like syntax ("pikipiki"); this module converts
// it to Markdown when a legacy file is imported.

/**
 * Convert the legacy wiki syntax to Markdown.
 *
 * Legacy syntax: ***bold***, **emphasis**, {{{preformatted}}}, ---- (rule),
 * "* item" and " * sub-item" lists, [https://url label] links.
 */
export function pikipikiToMarkdown(source) {
  let text = String(source || '').replace(/\r\n?/g, '\n');
  if (!text.trim()) {
    return '';
  }

  // Preformatted blocks are protected from the other conversions.
  const blocks = [];
  text = text.replace(/\{\{\{([\s\S]*?)\}\}\}/g, (match, code) => {
    blocks.push(code.includes('\n')
      ? `\n\n\`\`\`\n${code.replace(/^\n+|\n+$/g, '')}\n\`\`\`\n\n`
      : `\`${code.trim()}\``);
    return `\uE002${blocks.length - 1}\uE003`;
  });

  // Links: [https://url label] and [https://url]
  text = text.replace(/\[(https?:\/\/[^\s\]]+)(?:\s+([^\]]*))?\]/g, (match, url, label) => (
    label && label.trim() ? `[${label.trim()}](${url})` : `<${url}>`
  ));

  // Bold then emphasis; the order matters as both use asterisks.
  text = text
    .replace(/\*{3}((?:(?!\*{3}).)+)\*{3}/g, '\uE004$1\uE004')
    .replace(/\*{2}((?:(?!\*{2}).)+)\*{2}/g, '*$1*')
    .replace(/\uE004/g, '**');

  const lines = text.split('\n').map((line) => {
    if (/^-{4,}\s*$/.test(line)) {
      return '\n---\n';
    }
    if (/^ \* /.test(line)) {
      return `  - ${line.slice(3)}`;
    }
    if (/^\* /.test(line)) {
      return `- ${line.slice(2)}`;
    }
    return line;
  });

  return lines.join('\n')
    .replace(/\uE002(\d+)\uE003/g, (match, id) => blocks[Number(id)])
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
