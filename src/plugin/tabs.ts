import type { Custom, Plugin } from 'siyuan';
import { YeMindEditor } from '../editor/YeMindEditor';
import type { YeMindMapDocument } from '../model/types';
import { mountAfterReady, type DeferredMountState } from './deferredMount';
import type { YeMindPluginHost } from './host';
import { TAB_TYPE } from './constants';
import { waitForNonZeroSize } from './visibleElement';
import { flushPendingTabNodeFocus, requestTabNodeFocus, type TabNodeFocusState } from './tabNodeFocus';

interface TabMountState extends DeferredMountState, TabNodeFocusState {
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
        async ({ mapId: resolvedMapId, map }: { mapId: string; map?: YeMindMapDocument }) => {
          if (!map) {
            container.innerHTML = '<div class="ymz-missing"><b>导图不存在</b><span>它可能已被删除。</span></div>';
            return;
          }
          this.tab.updateTitle(map.title);
          const activateTab = (attempt = 0): void => {
            if (state.destroyed || !container.isConnected) return;
            const head = this.tab.headElement;
            if (head?.isConnected) {
              head.click();
              return;
            }
            if (attempt < 20) window.requestAnimationFrame(() => activateTab(attempt + 1));
          };
          state.unregister = host.tabRegistry.register(resolvedMapId, {
            activate: () => activateTab(),
            close: () => this.tab.close(),
            updateTitle: (title) => this.tab.updateTitle(title),
            focusNode: (uid) => requestTabNodeFocus(state, uid),
            isAlive: () => !state.destroyed
              && container.isConnected
              && (this.tab.headElement ? this.tab.headElement.isConnected : true),
          });
          host.diagnostics.record('tab', 'waiting-for-visible-container', resolvedMapId, undefined, 'info', true);
          const visible = await waitForNonZeroSize(container, { isCancelled: () => state.destroyed });
          if (!visible || state.destroyed) {
            host.diagnostics.record('tab', 'visible-container-wait-cancelled', resolvedMapId, undefined, 'warning', true);
            return;
          }
          host.diagnostics.record('tab', 'visible-container-ready', resolvedMapId, undefined, 'info', true);
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
          host.diagnostics.record('global-search', 'map-editor-ready', resolvedMapId, { pendingTarget: true });
          host.diagnostics.updateGlobalSearchState({ lastNavigationStep: 'map-editor-ready' });
          const pendingUid = host.consumePendingNodeTarget(resolvedMapId);
          if (pendingUid) requestTabNodeFocus(state, pendingUid);
          flushPendingTabNodeFocus(state);
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
