import type { Custom, Plugin } from 'siyuan';
import { YeMindEditor } from '../editor/YeMindEditor';
import type { YeMindMapDocument } from '../model/types';
import { mountAfterReady, type DeferredMountState } from './deferredMount';
import type { YeMindPluginHost } from './host';
import { TAB_TYPE } from './constants';

interface TabMountState extends DeferredMountState {
  editor?: YeMindEditor;
  unregister?: () => void;
}

export function registerYeMindTab(plugin: Plugin, host: YeMindPluginHost): void {
  const states = new WeakMap<object, TabMountState>();
  plugin.addTab({
    type: TAB_TYPE,
    init(this: Custom) {
      const container = this.element as HTMLElement;
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.minHeight = '0';
      container.innerHTML = '<div class="ymz-loading">正在加载导图…</div>';
      const state: TabMountState = { destroyed: false };
      states.set(this, state);
      const mapId = String(this.data?.mapId ?? '');

      void mountAfterReady(
        state,
        host.whenReady(),
        () => ({ mapId, map: host.repository.get(mapId) }),
        ({ mapId: resolvedMapId, map }: { mapId: string; map?: YeMindMapDocument }) => {
          if (!map) {
            container.innerHTML = '<div class="ymz-missing"><b>导图不存在</b><span>它可能已被删除。</span></div>';
            return;
          }
          this.tab.updateTitle(map.title);
          state.unregister = host.tabRegistry.register(resolvedMapId, {
            activate: () => this.tab.headElement?.click(),
            close: () => this.tab.close(),
            updateTitle: (title) => this.tab.updateTitle(title),
          });
          state.editor = new YeMindEditor({
            container,
            mapId: resolvedMapId,
            repository: host.repository,
            settingsStore: host.settingsStore,
            checkpointRepository: host.checkpointRepository,
            checkpointService: host.checkpointService,
            diagnostics: host.diagnostics,
            onMissing: () => this.tab.close(),
          });
        },
        (error) => {
          state.unregister?.();
          state.unregister = undefined;
          host.diagnostics.recordError('editor', 'tab-mount-failed', error, mapId, true);
          console.error('[YeMind Zen] map tab mount failed', error);
          container.innerHTML = '<div class="ymz-missing"><b>导图加载失败</b><span>请关闭标签后重新打开；若持续出现，请检查控制台日志。</span></div>';
        },
      );
    },
    resize(this: Custom) {
      states.get(this)?.editor?.resize();
    },
    destroy(this: Custom) {
      const state = states.get(this);
      if (!state) return;
      state.destroyed = true;
      state.editor?.destroy();
      state.unregister?.();
      states.delete(this);
    },
  });
}
