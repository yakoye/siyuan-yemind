import type { Custom, Plugin } from 'siyuan';
import { YeMindEditor } from '../editor/YeMindEditor';
import type { YeMindPluginHost } from './host';
import { TAB_TYPE } from './constants';

export function registerYeMindTab(plugin: Plugin, host: YeMindPluginHost): void {
  const editors = new WeakMap<object, YeMindEditor>();
  const unregisterTabs = new WeakMap<object, () => void>();
  plugin.addTab({
    type: TAB_TYPE,
    init(this: Custom) {
      const container = this.element as HTMLElement;
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.minHeight = '0';
      const mapId = String(this.data?.mapId ?? '');
      const map = host.repository.get(mapId);
      if (!map) {
        container.innerHTML = '<div class="ymz-missing"><b>导图不存在</b><span>它可能已被删除。</span></div>';
        return;
      }
      this.tab.updateTitle(map.title);
      const unregister = host.tabRegistry.register(mapId, {
        activate: () => this.tab.headElement?.click(),
        close: () => this.tab.close(),
        updateTitle: (title) => this.tab.updateTitle(title),
      });
      unregisterTabs.set(this, unregister);
      const editor = new YeMindEditor({
        container,
        mapId,
        repository: host.repository,
        settingsStore: host.settingsStore,
        onMissing: () => this.tab.close(),
      });
      editors.set(this, editor);
    },
    resize(this: Custom) {
      editors.get(this)?.resize();
    },
    destroy(this: Custom) {
      editors.get(this)?.destroy();
      editors.delete(this);
      unregisterTabs.get(this)?.();
      unregisterTabs.delete(this);
    },
  });
}
