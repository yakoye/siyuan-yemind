import type { MindMapNodeData, MindMapTree, YeMindMapDocument } from '../model/types';

const uid = (): string => globalThis.crypto?.randomUUID?.() ?? `import-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function plainText(data: MindMapNodeData): string {
  const value = String(data.text ?? '');
  if (!data.richText) return value;
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(`<body>${value}</body>`, 'text/html').body.textContent ?? '';
  }
  return value.replace(/<[^>]*>/g, '').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
}

const xmlEscape = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const htmlEscape = (value: string): string => xmlEscape(value).replaceAll('&apos;', '&#39;');

function visit(tree: MindMapTree, callback: (node: MindMapTree, depth: number) => void, depth = 0): void {
  callback(tree, depth);
  tree.children.forEach((child) => visit(child, callback, depth + 1));
}

export function exportMarkdown(map: YeMindMapDocument): string {
  const lines: string[] = [];
  visit(map.data, (node, depth) => {
    const text = plainText(node.data).replace(/\r?\n/g, ' ');
    lines.push(depth < 6 ? `${'#'.repeat(depth + 1)} ${text}` : `${'  '.repeat(depth - 6)}- ${text}`);
  });
  return `${lines.join('\n\n')}\n`;
}

export function exportText(map: YeMindMapDocument): string {
  const lines: string[] = [];
  visit(map.data, (node, depth) => lines.push(`${'  '.repeat(depth)}${plainText(node.data).replace(/\r?\n/g, ' ')}`));
  return `${lines.join('\n')}\n`;
}

function opmlNode(node: MindMapTree, depth: number): string {
  const padding = '  '.repeat(depth);
  const text = xmlEscape(plainText(node.data).replace(/\r?\n/g, ' '));
  if (node.children.length === 0) return `${padding}<outline text="${text}"/>`;
  return `${padding}<outline text="${text}">\n${node.children.map((child) => opmlNode(child, depth + 1)).join('\n')}\n${padding}</outline>`;
}

export function exportOpml(map: YeMindMapDocument): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head><title>${xmlEscape(map.title)}</title></head>\n  <body>\n${opmlNode(map.data, 2)}\n  </body>\n</opml>\n`;
}

function htmlNode(node: MindMapTree): string {
  const label = htmlEscape(plainText(node.data));
  if (node.children.length === 0) return `<li><span>${label}</span></li>`;
  return `<li><span>${label}</span><ul>${node.children.map(htmlNode).join('')}</ul></li>`;
}

export function exportHtml(map: YeMindMapDocument): string {
  const payload = JSON.stringify({ product: 'YeMind', format: 'yemind-map', version: 1, map })
    .replaceAll('<', '\\u003c');
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${htmlEscape(map.title)}</title>
<style>body{max-width:960px;margin:40px auto;padding:0 24px;font:16px/1.7 system-ui,sans-serif;color:#172033}h1{font-size:28px}ul{padding-left:1.5em}li{margin:.35em 0}span{padding:.12em .35em;border-radius:5px}li::marker{color:#8894a7}</style></head>
<body><h1>${htmlEscape(map.title)}</h1><main><ul>${htmlNode(map.data)}</ul></main>
<script type="application/yemind+json">${payload}</script></body></html>`;
}

interface OutlineLine {
  depth: number;
  text: string;
}

function treeFromLines(lines: OutlineLine[], fallbackTitle: string): MindMapTree {
  if (lines.length === 0) throw new Error('大纲文件没有可导入的节点');
  const minimum = Math.min(...lines.map((line) => line.depth));
  const normalized = lines.map((line) => ({ ...line, depth: Math.max(0, line.depth - minimum) }));
  if (normalized[0].depth !== 0) normalized[0].depth = 0;
  const roots: MindMapTree[] = [];
  const stack: MindMapTree[] = [];
  for (const line of normalized) {
    const depth = Math.min(line.depth, stack.length);
    const node: MindMapTree = { data: { text: line.text, uid: uid(), expand: true }, children: [] };
    stack.length = depth;
    if (depth === 0) roots.push(node);
    else stack[depth - 1].children.push(node);
    stack[depth] = node;
  }
  if (roots.length === 1) return roots[0];
  return { data: { text: fallbackTitle || '导入大纲', uid: uid(), expand: true }, children: roots };
}

function parseMarkdown(content: string): OutlineLine[] {
  const result: OutlineLine[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const heading = raw.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      result.push({ depth: heading[1].length - 1, text: heading[2] });
      continue;
    }
    const list = raw.match(/^(\s*)(?:[-+*]|\d+[.)])\s+(.+)$/);
    if (list) {
      const indent = list[1].replace(/\t/g, '  ').length;
      result.push({ depth: Math.floor(indent / 2), text: list[2].trim() });
    }
  }
  return result;
}

function parseText(content: string): OutlineLine[] {
  const rows = content.split(/\r?\n/).filter((line) => line.trim());
  return rows.map((raw) => {
    const prefix = raw.match(/^[\t ]*/)?.[0] ?? '';
    const spaces = prefix.replace(/\t/g, '  ').length;
    return {
      depth: Math.floor(spaces / 2),
      text: raw.slice(prefix.length).replace(/^(?:[-+*]|\d+[.)])\s+/, '').trim(),
    };
  });
}

function xmlTree(element: Element, childSelector: string, textAttributes: string[]): MindMapTree {
  const text = textAttributes.map((name) => element.getAttribute(name)).find((value) => value?.trim()) ?? '未命名节点';
  const children = Array.from(element.children)
    .filter((child) => child.matches(childSelector))
    .map((child) => xmlTree(child, childSelector, textAttributes));
  return { data: { text, uid: uid(), expand: true }, children };
}

function parseXml(content: string, kind: 'opml' | 'mm'): MindMapTree {
  const document = new DOMParser().parseFromString(content, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('XML 大纲格式损坏');
  if (kind === 'opml') {
    const roots = Array.from(document.querySelectorAll('body > outline'));
    if (roots.length === 0) throw new Error('OPML 文件没有根节点');
    const trees = roots.map((root) => xmlTree(root, 'outline', ['text', 'title']));
    return trees.length === 1 ? trees[0] : { data: { text: document.querySelector('head > title')?.textContent || '导入 OPML', uid: uid(), expand: true }, children: trees };
  }
  const root = document.querySelector('map > node');
  if (!root) throw new Error('FreeMind 文件没有根节点');
  return xmlTree(root, 'node', ['TEXT', 'text']);
}

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').trim() || '导入大纲';
}

export function parseOutlineDocument(filename: string, content: string): MindMapTree {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.opml') || /<opml[\s>]/i.test(content)) return parseXml(content, 'opml');
  if (lower.endsWith('.mm') || /<map[\s>]/i.test(content)) return parseXml(content, 'mm');
  const lines = lower.endsWith('.md') || /^\s*#{1,6}\s+/m.test(content)
    ? parseMarkdown(content)
    : parseText(content);
  return treeFromLines(lines, baseName(filename));
}
