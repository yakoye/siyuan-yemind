export interface YeMindLayoutPreset {
  id: string;
  label: string;
  family: 'logic' | 'tree' | 'timeline' | 'fishbone';
}

export const YEMIND_LAYOUT_PRESETS: readonly YeMindLayoutPreset[] = [
  { id: 'logicalStructure', label: '向右逻辑图', family: 'logic' },
  { id: 'logicalStructureLeft', label: '向左逻辑图', family: 'logic' },
  { id: 'mindMap', label: '双向思维导图', family: 'logic' },
  { id: 'organizationStructure', label: '向下组织结构', family: 'tree' },
  { id: 'catalogOrganization', label: '目录组织图', family: 'tree' },
  { id: 'timeline', label: '向右时间轴', family: 'timeline' },
  { id: 'timeline2', label: '双向时间轴', family: 'timeline' },
  { id: 'verticalTimeline', label: '竖向时间轴', family: 'timeline' },
  { id: 'verticalTimeline2', label: '竖向时间轴·左', family: 'timeline' },
  { id: 'verticalTimeline3', label: '竖向时间轴·右', family: 'timeline' },
  { id: 'fishbone', label: '左鱼骨·单侧', family: 'fishbone' },
  { id: 'fishbone2', label: '左鱼骨·双侧', family: 'fishbone' },
  { id: 'rightFishbone', label: '右鱼骨·单侧', family: 'fishbone' },
  { id: 'rightFishbone2', label: '右鱼骨·双侧', family: 'fishbone' },
] as const;

const LAYOUT_IDS = new Set(YEMIND_LAYOUT_PRESETS.map((item) => item.id));

export function normalizeLayoutId(value: unknown): string {
  return typeof value === 'string' && LAYOUT_IDS.has(value) ? value : 'logicalStructure';
}

export function layoutOptionsHtml(selected: unknown): string {
  const value = normalizeLayoutId(selected);
  const groups: Array<[YeMindLayoutPreset['family'], string]> = [
    ['logic', '逻辑与思维导图'],
    ['tree', '树形与目录'],
    ['timeline', '时间轴'],
    ['fishbone', '鱼骨图'],
  ];
  return groups.map(([family, label]) => {
    const options = YEMIND_LAYOUT_PRESETS
      .filter((item) => item.family === family)
      .map((item) => `<option value="${item.id}"${item.id === value ? ' selected' : ''}>${item.label}</option>`)
      .join('');
    return `<optgroup label="${label}">${options}</optgroup>`;
  }).join('');
}
