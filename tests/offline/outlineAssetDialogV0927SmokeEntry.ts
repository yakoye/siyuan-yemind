import { outlineAccessoriesFromData, outlineAccessoriesHtml } from '../../src/editor/outlineAccessories';
import { readFileSync } from 'node:fs';
import { buildHoverPreviewHtml } from '../../src/ui/nodeHoverPreview';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const html = outlineAccessoriesHtml(outlineAccessoriesFromData({
  uid: 'n1', text: 'node', icon: ['yemarkerpriority_priority-03'],
  yemindTodo: { checked: false, text: 'verify' },
  tag: ['PCIe'], hyperlink: 'https://example.com', outerFrame: { groupId: 'g1' },
}), '/plugins/siyuan-yemind/');
assert(html.includes('data-outline-icon-action'), 'outline marker must be actionable');
assert(html.includes('background-image:'), 'outline marker must use marker sprite background');
assert(!html.includes('<pattern'), 'outline marker must not duplicate SVG pattern IDs');
assert(html.includes('ymz-outline-accessories__todo'), 'todo must use compact borderless outline control');

const decorationSource = readFileSync('src/core/nodeDecorations.ts', 'utf8');
assert(decorationSource.includes('return { el, width: 18, height: 18 };'), 'canvas todo prefix must use 18px square geometry');
assert(buildHoverPreviewHtml('todo', { checked: false, text: 'verify' }).includes('verify'), 'todo hover preview missing');
assert(buildHoverPreviewHtml('tags', ['PCIe']).includes('PCIe'), 'tag hover preview missing');
assert(buildHoverPreviewHtml('link', 'https://example.com').includes('example.com'), 'link hover preview missing');
assert(buildHoverPreviewHtml('outer-frame', true).includes('外框'), 'outer-frame hover preview missing');

export default { htmlLength: html.length, todoGeometry: [18, 18] };
