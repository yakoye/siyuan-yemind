import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(root, 'docs/theme-colors/yemind_theme_colors_with_borders.json');
const outputPath = resolve(root, 'src/core/themeColorData.ts');

const NAME_TO_ID = new Map([
  ['晨曦', 'dawn'],
  ['彩虹', 'rainbow'],
  ['活力', 'vitality'],
  ['舞动', 'dance'],
  ['代码', 'code'],
  ['和风', 'harmony'],
  ['岛屿', 'island'],
  ['玫瑰', 'rose'],
  ['薄荷', 'mint'],
  ['绿茶', 'green-tea'],
  ['永恒', 'eternity'],
  ['奶油', 'cream'],
  ['花海', 'flower-sea'],
  ['珊瑚', 'coral'],
  ['绚丽', 'vivid'],
  ['香槟', 'champagne'],
  ['香水', 'perfume'],
  ['禅心', 'zen'],
  ['律动', 'rhythm'],
]);

const EXPECTED_NAMES = [...NAME_TO_ID.keys()];
const BRANCH_KEYS = [
  'centerToLevel1Line',
  'level1Text',
  'level1Background',
  'level1Border',
  'level1ToLevel2Line',
  'level2Text',
  'level2Background',
  'level2Border',
  'level2ToNormalLine',
  'normalText',
  'normalBackground',
  'normalBorder',
];
const COLOR_RE = /^(?:#[0-9A-F]{6}|transparent)$/;

function branch(
  line,
  level1Text,
  level1Background,
  level2Text = level1Text,
  level2Background = level1Background,
  normalText = level2Text,
  normalBackground = level2Background,
  borders = {},
) {
  return {
    centerToLevel1Line: line,
    level1Text,
    level1Background,
    level1Border: borders.level1 ?? 'transparent',
    level1ToLevel2Line: line,
    level2Text,
    level2Background,
    level2Border: borders.level2 ?? 'transparent',
    level2ToNormalLine: line,
    normalText,
    normalBackground,
    normalBorder: borders.normal ?? 'transparent',
  };
}

function repeatBranch(value) {
  return Array.from({ length: 6 }, () => ({ ...value }));
}

const BASE_APPEARANCES = [
  {
    id: 'yemind-default-light', presetId: 'yemind-default', name: 'YeMind 默认', category: '基础', appearance: 'light',
    background: '#F8FAFC', centerText: '#0F172A', centerBackground: '#FFFFFF', centerBorder: '#CBD5E1', cycleLength: 1,
    branches: repeatBranch(branch('#94A3B8', '#0F172A', '#FFFFFF', undefined, undefined, undefined, undefined, {
      level1: '#CBD5E1', level2: '#CBD5E1', normal: '#CBD5E1',
    })),
  },
  {
    id: 'yemind-default-dark', presetId: 'yemind-default', name: 'YeMind 默认', category: '基础', appearance: 'dark',
    background: '#0B1220', centerText: '#E2E8F0', centerBackground: '#0B1220', centerBorder: '#64748B', cycleLength: 1,
    branches: repeatBranch(branch('#94A3B8', '#E2E8F0', '#0B1220', undefined, undefined, undefined, undefined, {
      level1: '#64748B', level2: '#64748B', normal: '#64748B',
    })),
  },
  {
    id: 'ink-branch-light', presetId: 'ink-branch', name: 'Ink Branch', category: '基础', appearance: 'light',
    background: '#FFFFFF', centerText: '#3749B5', centerBackground: 'transparent', centerBorder: 'transparent', cycleLength: 1,
    branches: repeatBranch(branch('#151515', '#111111', 'transparent')),
  },
  {
    id: 'ink-branch-dark', presetId: 'ink-branch', name: 'Ink Branch', category: '基础', appearance: 'dark',
    background: '#0A0A0A', centerText: '#93A4FF', centerBackground: 'transparent', centerBorder: 'transparent', cycleLength: 1,
    branches: repeatBranch(branch('#F5F5F5', '#F5F5F5', 'transparent')),
  },
  {
    id: 'material-3-basic-light', presetId: 'material-3-basic', name: 'Material 3 Basic', category: '基础', appearance: 'light',
    background: '#FEF7FF', centerText: '#21005D', centerBackground: '#EADDFF', centerBorder: 'transparent', cycleLength: 1,
    branches: repeatBranch(branch('#79747E', '#1D192B', '#E8DEF8', '#1C1B1F', '#F3EDF7')),
  },
  {
    id: 'material-3-basic-dark', presetId: 'material-3-basic', name: 'Material 3 Basic', category: '基础', appearance: 'dark',
    background: '#141218', centerText: '#FEF7FF', centerBackground: '#4F378B', centerBorder: 'transparent', cycleLength: 1,
    branches: repeatBranch(branch('#938F99', '#E6E1E5', '#332D41', '#E6E1E5', '#211F26')),
  },
];

function fail(message) {
  throw new Error(`[theme-colors] ${message}`);
}

function validateColor(value, path) {
  if (typeof value !== 'string' || !COLOR_RE.test(value)) fail(`${path} must be #RRGGBB or transparent`);
}

function validateDefinition(item, path) {
  validateColor(item.background, `${path}.background`);
  validateColor(item.centerText, `${path}.centerText`);
  validateColor(item.centerBackground, `${path}.centerBackground`);
  validateColor(item.centerBorder, `${path}.centerBorder`);
  if (![1, 3, 4, 6].includes(item.cycleLength)) fail(`${path}.cycleLength must be 1, 3, 4, or 6`);
  if (!Array.isArray(item.branches) || item.branches.length !== 6) fail(`${path}.branches must contain six source records`);
  item.branches.forEach((entry, index) => {
    for (const key of BRANCH_KEYS) validateColor(entry?.[key], `${path}.branches[${index}].${key}`);
  });
}

const source = JSON.parse(await readFile(sourcePath, 'utf8'));
if (source.schemaVersion !== 2) fail('schemaVersion must be 2');
if (!source.themes || typeof source.themes !== 'object' || Array.isArray(source.themes)) fail('themes must be an object');
const names = Object.keys(source.themes);
if (JSON.stringify(names) !== JSON.stringify(EXPECTED_NAMES)) fail(`theme names/order mismatch: ${names.join('、')}`);

const generatedThemes = names.map((name) => {
  const sourceTheme = source.themes[name];
  validateDefinition(sourceTheme, `themes.${name}`);
  if (sourceTheme.category !== '缤纷' && sourceTheme.category !== '经典') fail(`themes.${name}.category must be 缤纷 or 经典`);
  return {
    id: `scheme-${NAME_TO_ID.get(name)}`,
    presetId: `scheme-${NAME_TO_ID.get(name)}`,
    name,
    category: sourceTheme.category,
    appearance: 'fixed',
    background: sourceTheme.background,
    centerText: sourceTheme.centerText,
    centerBackground: sourceTheme.centerBackground,
    centerBorder: sourceTheme.centerBorder,
    cycleLength: sourceTheme.cycleLength,
    branches: sourceTheme.branches,
  };
});

for (const [index, item] of BASE_APPEARANCES.entries()) validateDefinition(item, `baseAppearances[${index}]`);
const appearances = [...BASE_APPEARANCES, ...generatedThemes];
if (appearances.length !== 25) fail(`expected 25 appearance definitions, got ${appearances.length}`);

const banner = `// This file is generated by scripts/generate-theme-color-data.mjs.\n// Edit docs/theme-colors/yemind_theme_colors_with_borders.json for the 19 source themes.\n\n`;
const body = `${banner}export type ThemeColorCategory = '基础' | '缤纷' | '经典';
export type ThemeColorAppearanceMode = 'light' | 'dark' | 'fixed';

export interface ThemeColorBranch {
  centerToLevel1Line: string;
  level1Text: string;
  level1Background: string;
  level1Border: string;
  level1ToLevel2Line: string;
  level2Text: string;
  level2Background: string;
  level2Border: string;
  level2ToNormalLine: string;
  normalText: string;
  normalBackground: string;
  normalBorder: string;
}

export interface ThemeColorAppearance {
  id: string;
  presetId: string;
  name: string;
  category: ThemeColorCategory;
  appearance: ThemeColorAppearanceMode;
  background: string;
  centerText: string;
  centerBackground: string;
  centerBorder: string;
  cycleLength: 1 | 3 | 4 | 6;
  branches: readonly ThemeColorBranch[];
}

export const YEMIND_THEME_SOURCE_NAMES = ${JSON.stringify(names, null, 2)} as const;

export const YEMIND_THEME_COLOR_APPEARANCES = ${JSON.stringify(appearances, null, 2)} as const satisfies readonly ThemeColorAppearance[];

const APPEARANCE_BY_ID: ReadonlyMap<string, ThemeColorAppearance> = new Map(
  YEMIND_THEME_COLOR_APPEARANCES.map((item) => [item.id, item] as [string, ThemeColorAppearance]),
);
const FIXED_BY_PRESET: ReadonlyMap<string, ThemeColorAppearance> = new Map(
  YEMIND_THEME_COLOR_APPEARANCES
    .filter((item) => item.appearance === 'fixed')
    .map((item) => [item.presetId, item] as [string, ThemeColorAppearance]),
);

export function getThemeColorAppearance(presetId: unknown, appearance: 'light' | 'dark'): ThemeColorAppearance | null {
  if (typeof presetId !== 'string') return null;
  return APPEARANCE_BY_ID.get(\`${'${presetId}'}-${'${appearance}'}\`) ?? FIXED_BY_PRESET.get(presetId) ?? null;
}
`;

await writeFile(outputPath, body, 'utf8');
console.log(`[theme-colors] generated ${appearances.length} appearance definitions from ${names.length} source themes`);
