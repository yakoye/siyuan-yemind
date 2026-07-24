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

function bindOutsideClose(dialog: Dialog): void {
  dialog.element.addEventListener('mousedown', (event) => {
    const target = event.target as HTMLElement;
    if (target === dialog.element || target.classList.contains('b3-dialog__scrim')) {
      dialog.destroy();
    }
  });
  dialog.element.querySelector('[data-action="asset-dialog-close"]')
    ?.addEventListener('click', () => dialog.destroy());
}

function assetDialogCloseButton(label: string): string {
  return `<button type="button" class="ymz-local-asset-dialog__close" data-action="asset-dialog-close" title="${label}" aria-label="${label}">×</button>`;
}

export function openMarkerPicker(
  commands: YeMindCommands,
  options: { pluginBaseUrl?: string; initialGroupId?: string | null } = {},
): void {
  const dialog = new Dialog({
    title: '图标',
    content: `<div class="b3-dialog__content ymz-local-asset-dialog ymz-marker-dialog">
      ${assetDialogCloseButton('关闭图标')}
      <nav class="ymz-asset-tabs ymz-asset-tabs--sticky" data-role="marker-tabs" aria-label="图标分类"></nav>
      <div class="ymz-marker-scroll" data-role="marker-scroll"></div>
      <footer class="ymz-local-asset-dialog__footer">
        <button type="button" class="b3-button b3-button--cancel" data-action="clear-markers">清除图标</button>
        <button type="button" class="b3-button b3-button--text" data-action="close">完成</button>
      </footer>
    </div>`,
    width: '640px',
    height: '620px',
    hideCloseIcon: true,
  });
  bindOutsideClose(dialog);
  const tabs = dialog.element.querySelector<HTMLElement>('[data-role="marker-tabs"]')!;
  const scroll = dialog.element.querySelector<HTMLElement>('[data-role="marker-scroll"]')!;
  const sectionMap = new Map<string, HTMLElement>();

  const refreshSelection = (): void => {
    const selected = new Set(selectedIcons(commands));
    scroll.querySelectorAll<HTMLButtonElement>('[data-marker-value]').forEach((button) => {
      button.classList.toggle('is-selected', selected.has(button.dataset.markerValue ?? ''));
    });
  };

  const selectTab = (groupId: string): void => {
    tabs.querySelectorAll<HTMLButtonElement>('[data-marker-group]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.markerGroup === groupId);
    });
  };

  const all = document.createElement('button');
  all.type = 'button';
  all.className = 'ymz-asset-tab is-active';
  all.dataset.markerGroup = 'all';
  all.textContent = '全部';
  all.addEventListener('click', () => {
    scroll.scrollTo({ top: 0, behavior: 'smooth' });
    selectTab('all');
  });
  tabs.appendChild(all);

  markerCatalog.groups.forEach((group) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'ymz-asset-tab';
    tab.dataset.markerGroup = group.id;
    tab.textContent = group.label;
    tab.addEventListener('click', () => {
      const section = sectionMap.get(group.id);
      if (section) scroll.scrollTo({ top: section.offsetTop - 8, behavior: 'smooth' });
      selectTab(group.id);
    });
    tabs.appendChild(tab);

    const section = document.createElement('section');
    section.className = 'ymz-marker-section';
    section.dataset.markerSection = group.id;
    const heading = document.createElement('h3');
    heading.textContent = group.label;
    const grid = document.createElement('div');
    grid.className = 'ymz-marker-grid';
    markerCatalog.items.filter((item) => item.groupId === group.id).forEach((item) => {
      const value = markerValue(item);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ymz-marker-option';
      button.dataset.markerValue = value;
      button.title = `${item.groupLabel} ${item.orderInGroup}`;
      button.setAttribute('aria-label', button.title);
      const preview = document.createElement('span');
      preview.className = 'ymz-marker-sprite';
      applyStyle(preview, markerButtonStyle(options.pluginBaseUrl, item as MarkerItem));
      button.appendChild(preview);
      button.addEventListener('click', () => {
        const next = new Set(selectedIcons(commands));
        if (next.has(value)) next.delete(value); else next.add(value);
        commands.setIcons(Array.from(next));
        refreshSelection();
      });
      grid.appendChild(button);
    });
    section.append(heading, grid);
    scroll.appendChild(section);
    sectionMap.set(group.id, section);
  });

  scroll.addEventListener('scroll', () => {
    const scrollTop = scroll.scrollTop + 16;
    let current = 'all';
    sectionMap.forEach((section, id) => {
      if (section.offsetTop <= scrollTop) current = id;
    });
    selectTab(current);
  }, { passive: true });

  dialog.element.querySelector('[data-action="clear-markers"]')?.addEventListener('click', () => {
    commands.setIcons([]);
    refreshSelection();
  });
  dialog.element.querySelector('[data-action="close"]')?.addEventListener('click', () => dialog.destroy());
  refreshSelection();

  const initial = options.initialGroupId;
  if (initial && sectionMap.has(initial)) {
    requestAnimationFrame(() => {
      const section = sectionMap.get(initial);
      if (section) scroll.scrollTop = Math.max(0, section.offsetTop - 8);
      selectTab(initial);
    });
  }
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
      ${assetDialogCloseButton('关闭剪贴图')}
      <div class="ymz-clipart-search"><input class="b3-text-field" data-role="clipart-search" placeholder="搜索剪贴图"><span data-role="clipart-count"></span></div>
      <div class="ymz-asset-tabs ymz-asset-tabs--scroll ymz-asset-tabs--sticky" data-role="clipart-tabs"></div>
      <div class="ymz-clipart-grid" data-role="clipart-grid"></div>
    </div>`,
    width: '760px',
    height: '620px',
    hideCloseIcon: true,
  });
  bindOutsideClose(dialog);
  const search = dialog.element.querySelector<HTMLInputElement>('[data-role="clipart-search"]')!;
  const tabs = dialog.element.querySelector<HTMLElement>('[data-role="clipart-tabs"]')!;
  const grid = dialog.element.querySelector<HTMLElement>('[data-role="clipart-grid"]')!;
  const count = dialog.element.querySelector<HTMLElement>('[data-role="clipart-count"]')!;

  const render = (): void => {
    tabs.innerHTML = '';
    const all = document.createElement('button');
    all.type = 'button';
    all.className = `ymz-asset-tab${categoryId ? '' : ' is-active'}`;
    all.textContent = '全部';
    all.addEventListener('click', () => { categoryId = ''; render(); });
    tabs.appendChild(all);
    clipartCatalog.categories.forEach((category) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `ymz-asset-tab${category.id === categoryId ? ' is-active' : ''}`;
      button.textContent = category.label;
      button.addEventListener('click', () => { categoryId = category.id; render(); });
      tabs.appendChild(button);
    });
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
