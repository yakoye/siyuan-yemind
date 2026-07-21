import { describe, expect, it } from 'vitest';
import { buildRelationOptions } from '../../../src/core/relationConfig';
import { DEFAULT_SETTINGS } from '../../../src/settings/SettingsStore';
import { createSettingsDialogTemplate } from '../../../src/settings/settingsDialogTemplate';

describe('summary and relation configuration', () => {
  it('maps settings directly to simple-mind-map native option names', () => {
    expect(buildRelationOptions({
      ...DEFAULT_SETTINGS,
      defaultSummaryText: '结论',
      defaultRelationText: '依赖',
      relationAlwaysAboveNode: false,
      relationAdjustPoints: false,
    })).toEqual({
      defaultGeneralizationText: '结论',
      defaultAssociativeLineText: '依赖',
      associativeLineIsAlwaysAboveNode: false,
      enableAdjustAssociativeLinePoints: false,
    });
  });

  it('renders only the four upstream-backed summary and relation settings', () => {
    const html = createSettingsDialogTemplate(DEFAULT_SETTINGS);
    expect(html).toContain('默认概要文字');
    expect(html).toContain('默认关联线文字');
    expect(html).toContain('关联线始终显示在节点上层');
    expect(html).toContain('允许调整关联线端点和控制点');
  });
});
