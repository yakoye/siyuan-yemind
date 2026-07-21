import type { Plugin } from 'siyuan';
import type { SettingsStore } from './SettingsStore';
import type { DiagnosticsService } from '../diagnostics/DiagnosticsService';
import { openYeMindSettingsDialog } from './settingsDialog';

/**
 * Keep SiYuan's built-in plugin settings entry small and route it to the
 * complete YeMind dialog. This prevents the native list and the custom
 * dialog from exposing two different sets of options.
 */
export function registerSettings(plugin: Plugin, store: SettingsStore, diagnostics?: DiagnosticsService): void {
  const button = document.createElement('button');
  button.className = 'b3-button b3-button--outline';
  button.textContent = '打开完整设置';
  button.addEventListener('click', () => openYeMindSettingsDialog(store, { diagnostics }));
  plugin.setting.addItem({
    title: 'YeMind 设置',
    description: '常规设置、节点入口、富文本、代码块和快捷键统一在完整设置窗口中管理。',
    actionElement: button,
  });
}
