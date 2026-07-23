import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createSettingsDialogTemplate } from '../../../src/settings/settingsDialogTemplate';
import { DEFAULT_SETTINGS } from '../../../src/settings/SettingsStore';

const pluginSource = readFileSync(resolve(process.cwd(), 'src/plugin/YeMindPlugin.ts'), 'utf8');
const aboutSource = readFileSync(resolve(process.cwd(), 'src/ui/aboutDialog.ts'), 'utf8');
const readSource = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('v0.9.13 standalone About entry', () => {
  it('removes About from Settings and keeps version/actions in a standalone dialog', () => {
    const settingsHtml = createSettingsDialogTemplate(DEFAULT_SETTINGS);
    expect(settingsHtml).not.toContain('data-settings-page="about"');
    expect(settingsHtml).not.toContain('data-settings-panel="about"');
    expect(aboutSource).toContain('data-about-version="manifest"');
    expect(aboutSource).toContain('data-about-action="open-diagnostics"');
  });

  it('orders top-bar items as Settings, About, then Diagnostics', () => {
    const settings = pluginSource.indexOf("label: '设置'");
    const about = pluginSource.indexOf("label: '关于 YeMind'");
    const diagnostics = pluginSource.indexOf("label: '诊断与回归'");
    expect(settings).toBeGreaterThan(-1);
    expect(about).toBeGreaterThan(settings);
    expect(diagnostics).toBeGreaterThan(about);
  });
  it('keeps native settings registration optional during early SiYuan startup', () => {
    const source = readSource('src/settings/settings.ts');
    expect(source).toContain('if (!plugin.setting?.addItem) return');
  });

});
