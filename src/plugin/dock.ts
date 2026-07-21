import type { Custom, MobileCustom, Plugin } from 'siyuan';
import { DOCK_TYPE, ICON_ID } from './constants';
import type { YeMindPluginHost } from './host';

class YeMindDockView {
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly host: YeMindPluginHost, private readonly element: HTMLElement) {
    this.element.classList.add('ymz-dock');
    this.unsubscribe = this.host.repository.subscribe(() => this.render());
  }

  destroy(): void {
    this.unsubscribe?.();
    this.element.innerHTML = '';
  }

  render(): void {
    const maps = this.host.repository.list();
    const activeId = this.host.repository.getActiveMapId();
    this.element.innerHTML = `<div class="ymz-dock__head"><span>YeMind Zen</span><button data-action="new" aria-label="新建导图" title="新建导图">＋</button><button data-action="refresh" aria-label="刷新" title="刷新">↻</button></div><div class="ymz-dock__body"></div>`;
    const body = this.element.querySelector('.ymz-dock__body') as HTMLElement;
    if (maps.length === 0) {
      body.innerHTML = '<div class="ymz-dock__empty">暂无导图</div>';
    } else {
      maps.forEach((map) => {
        const row = document.createElement('div');
        row.className = `ymz-dock__item${map.id === activeId ? ' is-active' : ''}`;
        row.dataset.mapId = map.id;
        row.innerHTML = `<button class="ymz-dock__title" data-action="open" title="${escapeHtml(map.title)}">${escapeHtml(map.title)}</button><button class="ymz-dock__action" data-action="copy" title="复制链接"><svg><use xlink:href="#iconCopy"></use></svg></button><button class="ymz-dock__action" data-action="rename" title="重命名"><svg><use xlink:href="#iconEdit"></use></svg></button><button class="ymz-dock__action" data-action="delete" title="删除"><svg><use xlink:href="#iconTrashcan"></use></svg></button>`;
        body.appendChild(row);
      });
    }
    this.bindEvents();
  }

  private bindEvents(): void {
    this.element.querySelector('[data-action="new"]')?.addEventListener('click', () => void this.host.createMap());
    this.element.querySelector('[data-action="refresh"]')?.addEventListener('click', () => this.render());
    this.element.querySelectorAll<HTMLElement>('.ymz-dock__item').forEach((row) => {
      const mapId = row.dataset.mapId!;
      row.querySelector('[data-action="open"]')?.addEventListener('click', () => void this.host.openMap(mapId));
      row.querySelector('[data-action="copy"]')?.addEventListener('click', () => void this.host.copyMapLink(mapId));
      row.querySelector('[data-action="rename"]')?.addEventListener('click', () => void this.host.renameMap(mapId));
      row.querySelector('[data-action="delete"]')?.addEventListener('click', () => void this.host.deleteMap(mapId));
    });
  }
}

export function registerYeMindDock(plugin: Plugin, host: YeMindPluginHost): void {
  const views = new WeakMap<object, YeMindDockView>();
  plugin.addDock({
    config: {
      position: 'LeftBottom',
      size: { width: 280, height: 0 },
      icon: ICON_ID,
      title: 'YeMind Zen',
      show: true,
    },
    data: {},
    type: DOCK_TYPE,
    init(this: Custom | MobileCustom) {
      const view = new YeMindDockView(host, this.element as HTMLElement);
      views.set(this, view);
    },
    destroy(this: Custom | MobileCustom) {
      views.get(this)?.destroy();
      views.delete(this);
    },
    update(this: Custom | MobileCustom) {
      views.get(this)?.render();
    },
  });
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
