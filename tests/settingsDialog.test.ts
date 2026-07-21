import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, DEFAULT_SHORTCUTS } from '../src/settings/SettingsStore';
import { createSettingsDialogTemplate } from '../src/settings/settingsDialogTemplate';

describe('custom settings dialog', () => {
  it('renders KMind-Zen-style general and shortcut pages', () => {
    const html = createSettingsDialogTemplate({ ...DEFAULT_SETTINGS, shortcutMap: { ...DEFAULT_SHORTCUTS } });

    expect(html).toContain('data-settings-page="general"');
    expect(html).toContain('data-settings-page="shortcuts"');
    expect(html).toContain('默认视图模式');
    expect(html).toContain('画布操作习惯');
    expect(html).toContain('节点入口控件');
    expect(html).toContain('富文本与代码');
    expect(html).toContain('快捷键');
    expect(html).toContain('录制');
    expect(html).toContain('禁用');
    expect(html).toContain('恢复默认');
    expect(html).toContain('data-settings-action="save"');
    expect(html).toContain('data-settings-action="cancel"');
  });
});
