import { createEditorTemplate } from '../../src/editor/editorTemplate';
import { normalizeMapTitle } from '../../src/editor/mapTitle';
import { directChildCount, resolveQuickActionAnchor } from '../../src/editor/nodeQuickActions';
import { RELATION_HIT_WIDTH, resolveRelationHitWidth } from '../../src/core/relationHitArea';
import { parseZoomPercent } from '../../src/editor/zoomPercent';
import { DEFAULT_SETTINGS } from '../../src/settings/SettingsStore';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const html = createEditorTemplate('Demo');
assert(html.includes('data-action="toggle-toolbar-pin"'), 'toolbar pin missing');
assert(html.includes('data-role="title-input"'), 'title input missing');
assert(html.includes('<input class="ymz-zoom"'), 'zoom input missing');
assert(typeof DEFAULT_SETTINGS.toolbarsPinned === 'boolean', 'toolbar pin default missing');
assert(parseZoomPercent('125%', 20, 400) === 125, 'zoom parsing failed');
assert(parseZoomPercent('5', 20, 400) === 20, 'zoom minimum clamp failed');
assert(normalizeMapTitle(' ') === '未命名导图', 'blank title fallback failed');
assert(RELATION_HIT_WIDTH >= 10 && resolveRelationHitWidth(3) === RELATION_HIT_WIDTH, 'relation hit width failed');
assert(directChildCount({ nodeData: { children: [{ children: [{}] }, {}] } }) === 2, 'direct child count failed');
const anchor = resolveQuickActionAnchor(
  { left: 100, top: 100, width: 80, height: 40 },
  [{ left: -40, top: 100, width: 80, height: 40 }],
);
assert(anchor.side === 'left' && anchor.x === 100, 'left branch anchor failed');

export default { relationHitWidth: RELATION_HIT_WIDTH, anchor, title: normalizeMapTitle(' ') };
