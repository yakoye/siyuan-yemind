import { Dialog } from 'siyuan';
import type { YeMindCommands } from '../core/commands';
import {
  clipartCatalog,
  createRuntimeAssetResolver,
  markerButtonStyle,
  markerCatalog,
  markerValue,
  searchClipart,
  type MarkerItem,
} from '../core/localAssetCatalogs';
import { normalizeStringList } from '../content/nodeContentState';
import { resolveClipartDisplaySize } from '../core/clipartGeometry';

function applyStyle(element: HTMLElement, style: Record<string, string>): void {
  Object.assign(element.style, style);
}

function selectedIcons(commands: YeMindCommands): string[] {
  return normalizeStringList(commands.getPrimaryNodeData()?.icon);
}

function prepareAssetDialog(dialog: Dialog): void {
  dialog.element.classList.add('ymz-asset-dialog-shell');
  dialog.element.addEventListener('mousedown', (event) => {
    const target = event.target as HTMLElement;
    if (target === dialog.element || target.classList.contains('b3-dialog__scrim')) {
      dialog.destroy();
    }
  });
}

export function openMarkerPicker(
  commands: YeMindCommands,
  options: { pluginBaseUrl?: string; initialGroupId?: string | null } = {},
): void {
  let activeGroupId = options.initialGroupId && markerCatalog.groups.some((group) => group.id === options.initialGroupId)
    ? options.initialGroupId
    : '';
  const dialog = new Dialog({
    title: '图标',
    content: `<div class="b3-dialog__content ymz-local-asset-dialog ymz-marker-dialog">
      <nav class="ymz-asset-tabs ymz-asset-tabs--sticky" data-role="marker-tabs" aria-label="图标分类"></nav>
      <div class="ymz-marker-scroll" data-role="marker-scroll"><div class="ymz-marker-groups" data-role="marker-groups"></div></div>
      <footer class="ymz-local-asset-dialog__footer">
        <button type="button" class="b3-button b3-button--cancel" data-action="clear-markers">清除图标</button>
        <button type="button" class="b3-button b3-button--text" data-action="close">完成</button>
      </footer>
    </div>`,
    width: '640px',
    height: '620px',
    hideCloseIcon: false,
  });
  prepareAssetDialog(dialog);
  const tabs = dialog.element.querySelector<HTMLElement>('[data-role="marker-tabs"]')!;
  const scroll = dialog.element.querySelector<HTMLElement>('[data-role="marker-scroll"]')!;
  const groups = dialog.element.querySelector<HTMLElement>('[data-role="marker-groups"]')!;

  const refreshSelection = (): void => {
    const selected = new Set(selectedIcons(commands));
    groups.querySelectorAll<HTMLButtonElement>('[data-marker-value]').forEach((button) => {
      button.classList.toggle('is-selected', selected.has(button.dataset.markerValue ?? ''));
    });
  };

  const createOption = (item: MarkerItem): HTMLButtonElement => {
    const value = markerValue(item);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ymz-marker-option';
    button.dataset.markerValue = value;
    button.title = `${item.groupLabel} ${item.orderInGroup}`;
    button.setAttribute('aria-label', button.title);
    const preview = document.createElement('span');
    preview.className = 'ymz-marker-sprite';
    applyStyle(preview, markerButtonStyle(options.pluginBaseUrl, item));
    button.appendChild(preview);
    button.addEventListener('click', () => {
      const next = new Set(selectedIcons(commands));
      if (next.has(value)) next.delete(value); else next.add(value);
      commands.setIcons(Array.from(next));
      refreshSelection();
    });
    return button;
  };

  markerCatalog.groups.forEach((group) => {
    const section = document.createElement('section');
    section.className = 'ymz-marker-group';
    section.dataset.markerGroupSection = group.id;
    section.setAttribute('aria-label', group.label);
    const grid = document.createElement('div');
    grid.className = 'ymz-marker-grid';
    markerCatalog.items
      .filter((item) => item.groupId === group.id)
      .forEach((item) => grid.appendChild(createOption(item)));
    section.appendChild(grid);
    groups.appendChild(section);
  });

  const selectTab = (id: string, scrollToGroup = true): void => {
    activeGroupId = id;
    tabs.querySelectorAll<HTMLButtonElement>('[data-marker-group]').forEach((button) => {
      button.classList.toggle('is-active', (button.dataset.markerGroup ?? '') === activeGroupId);
    });
    if (!scrollToGroup) return;
    if (!id) {
      scroll.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    groups.querySelector<HTMLElement>(`[data-marker-group-section="${id}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const addTab = (id: string, label: string): void => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `ymz-asset-tab${id === activeGroupId ? ' is-active' : ''}`;
    button.dataset.markerGroup = id;
    button.textContent = label;
    button.addEventListener('click', () => selectTab(id));
    tabs.appendChild(button);
  };
  addTab('', '全部');
  markerCatalog.groups.forEach((group) => addTab(group.id, group.label));

  dialog.element.querySelector('[data-action="clear-markers"]')?.addEventListener('click', () => {
    commands.setIcons([]);
    refreshSelection();
  });
  dialog.element.querySelector('[data-action="close"]')?.addEventListener('click', () => dialog.destroy());
  refreshSelection();
  if (activeGroupId) requestAnimationFrame(() => selectTab(activeGroupId));
}

export function openClipartPicker(
  commands: YeMindCommands,
  options: { pluginBaseUrl?: string } = {},
): void {
  const resolver = createRuntimeAssetResolver(options.pluginBaseUrl);
  let categoryId = '';
  let query = '';
  const dialog = new Dialog({
    title: '剪贴图',
    content: `<div class="b3-dialog__content ymz-local-asset-dialog ymz-clipart-dialog">
      <div class="ymz-clipart-search"><input class="b3-text-field" data-role="clipart-search" placeholder="搜索剪贴图"><span data-role="clipart-count"></span></div>
      <div class="ymz-asset-tabs ymz-asset-tabs--scroll ymz-asset-tabs--sticky" data-role="clipart-tabs"></div>
      <div class="ymz-clipart-grid" data-role="clipart-grid"></div>
    </div>`,
    width: '760px',
    height: '620px',
    hideCloseIcon: false,
  });
  prepareAssetDialog(dialog);
  const search = dialog.element.querySelector<HTMLInputElement>('[data-role="clipart-search"]')!;
  const tabs = dialog.element.querySelector<HTMLElement>('[data-role="clipart-tabs"]')!;
  const grid = dialog.element.querySelector<HTMLElement>('[data-role="clipart-grid"]')!;
  const count = dialog.element.querySelector<HTMLElement>('[data-role="clipart-count"]')!;

  const render = (): void => {
    tabs.innerHTML = '';
    const addTab = (id: string, label: string): void => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `ymz-asset-tab${id === categoryId ? ' is-active' : ''}`;
      button.textContent = label;
      button.addEventListener('click', () => { categoryId = id; render(); });
      tabs.appendChild(button);
    };
    addTab('', '全部');
    clipartCatalog.categories.forEach((category) => addTab(category.id, category.label));

    const matches = searchClipart(query, categoryId || undefined);
    count.textContent = `${matches.length} 个`;
    grid.innerHTML = '';
    matches.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ymz-clipart-option';
      button.title = item.label;
      const img = document.createElement('img');
      img.src = resolver.clipartUrl(item.relativePath);
      img.alt = item.label;
      img.loading = 'lazy';
      img.draggable = false;
      const label = document.createElement('span');
      label.textContent = item.label;
      button.append(img, label);
      button.addEventListener('click', async () => {
        if (button.disabled) return;
        button.disabled = true;
        const url = resolver.clipartUrl(item.relativePath);
        const size = await resolveClipartDisplaySize(url, img);
        commands.setClipart({
          id: item.id,
          url,
          title: item.label,
          width: size.width,
          height: size.height,
          custom: true,
        });
        dialog.destroy();
      });
      grid.appendChild(button);
    });
  };
  search.addEventListener('input', () => { query = search.value; render(); });
  render();
  search.focus();
}
