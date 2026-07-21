import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, DEFAULT_SHORTCUTS } from '../src/settings/SettingsStore';
import { createSettingsDialogTemplate } from '../src/settings/settingsDialogTemplate';

describe('custom settings dialog', () => {
  it('renders KMind-Zen-style general and shortcut pages', () => {
    const html = createSettingsDialogTemplate({ ...DEFAULT_SETTINGS, shortcutMap: { ...DEFAULT_SHORTCUTS } });

    expect(html).toContain('data-settings-page="general"');
    expect(html).toContain('data-settings-page="drag-layout"');
    expect(html).toContain('data-settings-page="content"');
    expect(html).toContain('data-settings-page="shortcuts"');
    expect(html).toContain('默认视图模式');
    expect(html).toContain('画布操作习惯');
    expect(html).toContain('节点入口控件');
    expect(html).toContain('simple-mind-map 原生拖拽');
    expect(html).toContain('边缘自动平移');
    expect(html).not.toContain('拖拽后保持视图位置');
    expect(html).toContain('二级节点纵向间距');
    expect(html).toContain('下级节点纵向间距');
    expect(html).toContain('恢复上次视图位置');
    expect(html).toContain('富文本与代码');
    expect(html).toContain('快捷键');
    expect(html).toContain('录制');
    expect(html).toContain('禁用');
    expect(html).toContain('恢复默认');
    expect(html).toContain('data-settings-action="save"');
    expect(html).toContain('data-settings-action="cancel"');
  });
});

it('renders a control for every persisted setting except the shortcut map', () => {
  const html = createSettingsDialogTemplate({ ...DEFAULT_SETTINGS, shortcutMap: { ...DEFAULT_SHORTCUTS } });
  const keys = Object.keys(DEFAULT_SETTINGS).filter((key) => key !== 'shortcutMap');
  keys.forEach((key) => expect(html, `missing setting control: ${key}`).toContain(`data-setting="${key}"`));
  Object.keys(DEFAULT_SHORTCUTS).forEach((key) => expect(html).toContain(`data-shortcut="${key}"`));
});
