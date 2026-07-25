import { outlineAccessoriesFromData, outlineAccessoriesHtml } from '../../src/editor/outlineAccessories';
import { computeAssetDialogPlacement } from '../../src/ui/anchoredPlacement';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const html = outlineAccessoriesHtml(outlineAccessoriesFromData({
  uid: 'n1', text: 'node', icon: ['yemarkerpriority_priority-03'],
  yemindNote: { html: '<p>note</p>' },
  yemindComments: [{ id: 'c1', text: 'comment', createdAt: 1, updatedAt: 1 }],
}), '/plugins/siyuan-yemind');
assert(html.includes('background-size:244.2857px 313.7143px'), 'compact marker background size missing');
assert(html.includes('href="#iconYeMindNote"'), 'note symbol missing');
assert(html.includes('href="#iconYeMindComment"'), 'comment symbol missing');
assert(!html.includes('>1</button>'), 'comment count must not render as a leading number');

const viewport = { left: 0, top: 0, right: 1280, bottom: 760, width: 1280, height: 760 };
const anchor = { left: 1252, top: 732, right: 1272, bottom: 752, width: 20, height: 20 };
const placement = computeAssetDialogPlacement({ viewport, anchor, dialog: { width: 600, height: 620 } });
assert(placement.candidateCount === 8, 'asset placement must evaluate eight candidates');
assert(placement.left >= 12 && placement.top >= 12, 'asset placement escaped viewport');
assert(placement.left + placement.width <= 1268 && placement.top + placement.height <= 748, 'asset placement overflowed viewport');

export default { htmlLength: html.length, placement: placement.placement };
