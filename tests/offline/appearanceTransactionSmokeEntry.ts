import { applyMapAppearanceTransaction } from '../../src/core/appearanceTransaction';
import { getThemeColorAppearance } from '../../src/core/themeColorData';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const selected = { getData: (key?: string) => key === 'uid' ? 'node-1' : { uid: 'node-1' } };
const restored = { getData: (key?: string) => key === 'uid' ? 'node-1' : { uid: 'node-1' } };
const calls: string[] = [];
const map: any = {
  opt: { rainbowLinesConfig: { open: false, colorsList: ['#OLD001', '#OLD002'] } },
  renderer: {
    renderTree: { data: {}, children: [] },
    _render() {},
    activeNodeList: [selected],
    findNodeByUid(uid: string) { return uid === 'node-1' ? restored : null; },
    activeMultiNode(nodes: unknown[]) { calls.push(`restore:${nodes.length}`); },
  },
  emit(event: string) { calls.push(event); },
  setThemeConfig(_config: unknown, silent: boolean) { assert(silent === true, 'theme config must be silent'); calls.push('theme'); },
  updateConfig() { throw new Error('rainbow config must not use deep-merge updateConfig'); },
  reRender(callback: () => void, source: string) { calls.push(`rerender:${source}`); callback(); },
};
const appearance = getThemeColorAppearance('scheme-code', 'light');
assert(appearance, 'code theme missing');
const palette = { open: true, colorsList: ['#FFF0B8', '#CBFFB8', '#DB8FFF', '#8ABEFF'] };
applyMapAppearanceTransaction({
  map,
  themeConfig: { backgroundColor: '#2C2D30' },
  rainbowLinesConfig: palette,
  colorAppearance: appearance,
  useThemeLineColors: false,
  afterRender: () => calls.push('after'),
});
assert(JSON.stringify(map.opt.rainbowLinesConfig) === JSON.stringify(palette), 'rainbow colors must replace the previous array exactly');
assert(calls.includes('rerender:changeTheme'), 'appearance must use a complete changeTheme redraw');
assert(calls.includes('restore:1'), 'active node selection must be restored');
assert(calls.at(-1) === 'after', 'overlays must refresh after the node redraw');

export default {
  exactRainbowReplacement: true,
  completeRedraw: true,
  selectionRestored: true,
  callOrder: calls,
};
