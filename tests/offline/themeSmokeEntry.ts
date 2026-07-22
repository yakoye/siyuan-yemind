import {
  YEMIND_THEME_COLOR_APPEARANCES,
  YEMIND_THEME_SOURCE_NAMES,
  getThemeColorAppearance,
} from '../../src/core/themeColorData';
import {
  YEMIND_THEME_PRESETS,
  themeOptionsHtml,
} from '../../src/core/themePresets';
import {
  configureThemeColorRuntime,
  installThemeColorRuntime,
  normalizeThemeBranchIndex,
  resolveThemeNodeColors,
} from '../../src/core/themeColorRuntime';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function isColor(value: unknown): boolean {
  return value === 'transparent' || (typeof value === 'string' && /^#[0-9A-F]{6}$/.test(value));
}

function runThemeSmoke(): Record<string, unknown> {
  const expectedNames = ['晨曦','彩虹','活力','舞动','代码','和风','岛屿','玫瑰','薄荷','绿茶','永恒','奶油','花海','珊瑚','绚丽','香槟','香水','禅心','律动'];
  assert(JSON.stringify(YEMIND_THEME_SOURCE_NAMES) === JSON.stringify(expectedNames), '19 source theme names/order mismatch');
  assert(YEMIND_THEME_COLOR_APPEARANCES.length === 25, 'appearance count must be 25');
  assert(YEMIND_THEME_PRESETS.length === 22, 'theme preset count must be 22');

  const groupCounts = YEMIND_THEME_PRESETS.reduce<Record<string, number>>((counts, preset) => {
    counts[preset.group] = (counts[preset.group] ?? 0) + 1;
    return counts;
  }, {});
  assert(groupCounts['基础'] === 3, 'base theme count mismatch');
  assert(groupCounts['缤纷'] === 10, 'colorful theme count mismatch');
  assert(groupCounts['经典'] === 9, 'classic theme count mismatch');

  for (const appearance of YEMIND_THEME_COLOR_APPEARANCES) {
    assert([1, 3, 4, 6].includes(appearance.cycleLength), `${appearance.id}: invalid cycle`);
    assert(appearance.branches.length === 6, `${appearance.id}: must contain six branch definitions`);
    for (const value of [appearance.background, appearance.centerText, appearance.centerBackground, appearance.centerBorder]) {
      assert(isColor(value), `${appearance.id}: invalid top-level color ${String(value)}`);
    }
    for (const branch of appearance.branches) {
      for (const value of Object.values(branch)) assert(isColor(value), `${appearance.id}: invalid branch color ${String(value)}`);
    }
  }

  const cycleCoverage = new Set(YEMIND_THEME_COLOR_APPEARANCES.map((item) => item.cycleLength));
  assert([1, 3, 4, 6].every((value) => cycleCoverage.has(value as 1 | 3 | 4 | 6)), 'branch cycles 1/3/4/6 must all be covered');
  assert(normalizeThemeBranchIndex(-1, 6) === 5, 'negative branch index wrapping failed');
  assert(normalizeThemeBranchIndex(7, 6) === 1, 'positive branch index wrapping failed');

  const dawn = getThemeColorAppearance('scheme-dawn', 'light');
  assert(dawn, 'dawn appearance missing');
  const rootColors = resolveThemeNodeColors(dawn, 0, 0);
  const level1Colors = resolveThemeNodeColors(dawn, 1, 0);
  const level2Colors = resolveThemeNodeColors(dawn, 2, 0);
  const normalColors = resolveThemeNodeColors(dawn, 3, 0);
  assert(rootColors.fillColor === dawn.centerBackground && rootColors.color === dawn.centerText && rootColors.borderColor === dawn.centerBorder, 'center colors mismatch');
  assert(level1Colors.lineColor === dawn.branches[0].centerToLevel1Line, 'center-to-level1 line mismatch');
  assert(level2Colors.lineColor === dawn.branches[0].level1ToLevel2Line, 'level1-to-level2 line mismatch');
  assert(normalColors.lineColor === dawn.branches[0].level2ToNormalLine, 'level2-to-normal line mismatch');

  const localFill = '#123456';
  const localBorder = '#654321';
  const tree: any = {
    data: { text: 'root' },
    children: [
      { data: { text: 'branch-a' }, children: [{ data: { text: 'level-2' }, children: [{ data: { text: 'normal' } }] }] },
      { data: { text: 'branch-b', fillColor: localFill, borderColor: localBorder }, children: [] },
    ],
  };
  let renderCalls = 0;
  const mindMap: any = {
    renderer: {
      renderTree: tree,
      _render() { renderCalls += 1; return 'rendered'; },
    },
  };
  installThemeColorRuntime(mindMap);
  configureThemeColorRuntime(mindMap, { appearance: dawn, useThemeLineColors: true });
  const result = mindMap.renderer._render();
  assert(result === 'rendered' && renderCalls === 1, 'renderer wrapper failed');
  assert(tree.data.fillColor === dawn.centerBackground, 'runtime center fill mismatch');
  assert(tree.children[0].data.fillColor === dawn.branches[0].level1Background, 'runtime level1 fill mismatch');
  assert(tree.children[0].data.borderColor === dawn.branches[0].level1Border, 'runtime level1 border mismatch');
  assert(tree.children[0].children[0].data.color === dawn.branches[0].level2Text, 'runtime level2 text mismatch');
  assert(tree.children[0].children[0].children[0].data.lineColor === dawn.branches[0].level2ToNormalLine, 'runtime normal line mismatch');
  assert(tree.children[1].data.fillColor === localFill, 'local node fill must override theme');
  assert(tree.children[1].data.borderColor === localBorder, 'local node border must override theme');
  assert(Object.prototype.propertyIsEnumerable.call(tree.children[1].data, 'fillColor'), 'local override must remain enumerable');

  const serialized = JSON.stringify(tree);
  assert(!serialized.includes(dawn.centerBackground), 'generated center style must not be serialized');
  assert(serialized.includes(localFill) && serialized.includes(localBorder), 'local styles must be serialized');
  assert(!Object.prototype.propertyIsEnumerable.call(tree.data, 'fillColor'), 'generated fill accessor must be non-enumerable');

  configureThemeColorRuntime(mindMap, { appearance: dawn, useThemeLineColors: false });
  assert(!Object.prototype.hasOwnProperty.call(tree.children[0].data, 'lineColor'), 'theme line accessor must be removed when project line colors own rendering');

  const optionsHtml = themeOptionsHtml('scheme-dawn');
  assert(optionsHtml.includes('optgroup label="基础"'), 'base optgroup missing');
  assert(optionsHtml.includes('optgroup label="缤纷"'), 'colorful optgroup missing');
  assert(optionsHtml.includes('optgroup label="经典"'), 'classic optgroup missing');
  assert(optionsHtml.includes('value="scheme-dawn" selected'), 'selected theme option missing');

  return {
    sourceThemes: YEMIND_THEME_SOURCE_NAMES.length,
    appearances: YEMIND_THEME_COLOR_APPEARANCES.length,
    presets: YEMIND_THEME_PRESETS.length,
    groupCounts,
    cycles: [...cycleCoverage].sort(),
    runtimeSerializationProtected: true,
    localStylePriority: true,
    borderColorCoverage: true,
    lineOwnershipSwitch: true,
  };
}

export default runThemeSmoke();
