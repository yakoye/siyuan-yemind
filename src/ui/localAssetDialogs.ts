import { Dialog } from 'siyuan';
import type { YeMindCommands } from '../core/commands';
import {
  clipartCatalog,
  createRuntimeAssetResolver,
  markerButtonStyle,
  markerCatalog,
  markerGroupForValue,
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

export function openMarkerPicker(
  commands: YeMindCommands,
  options: { pluginBaseUrl?: string; initialGroupId?: string | null } = {},
): void {
  let activeGroup = options.initialGroupId
    ?? selectedIcons(commands).map(markerGroupForValue).find(Boolean)
    ?? markerCatalog.groups[0]?.id
    ?? 'priority';
  const dialog = new Dialog({
    title: '图标',
    content: `<div class="b3-dialog__content ymz-local-asset-dialog ymz-marker-dialog">
      <div class="ymz-asset-tabs" data-role="marker-tabs"></div>
      <div class="ymz-marker-grid" data-role="marker-grid"></div>
      <footer class="ymz-local-asset-dialog__footer"><button type="button" class="b3-button b3-button--cancel" data-action="clear-markers">清除图标</button><span class="fn__space"></span><button type="button" class="b3-button b3-button--text" data-action="close">完成</button></footer>
    </div>`,
    width: '520px',
  });
  const tabs = dialog.element.querySelector<HTMLElement>('[data-role="marker-tabs"]')!;
  const grid = dialog.element.querySelector<HTMLElement>('[data-role="marker-grid"]')!;
  const render = (): void => {
    const selected = new Set(selectedIcons(commands));
    tabs.innerHTML = '';
    markerCatalog.groups.forEach((group) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `ymz-asset-tab${group.id === activeGroup ? ' is-active' : ''}`;
      button.textContent = group.label;
      button.addEventListener('click', () => { activeGroup = group.id; render(); });
      tabs.appendChild(button);
    });
    grid.innerHTML = '';
    markerCatalog.items.filter((item) => item.groupId === activeGroup).forEach((item) => {
      const value = markerValue(item);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `ymz-marker-option${selected.has(value) ? ' is-selected' : ''}`;
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
        render();
      });
      grid.appendChild(button);
    });
  };
  dialog.element.querySelector('[data-action="clear-markers"]')?.addEventListener('click', () => {
    commands.setIcons([]);
    render();
  });
  dialog.element.querySelector('[data-action="close"]')?.addEventListener('click', () => dialog.destroy());
  render();
}

export function openClipartPicker(
  commands: YeMindCommands,
  options: { pluginBaseUrl?: string } = {},
): void {
  const resolver = createRuntimeAssetResolver(options.pluginBaseUrl);
  let categoryId = '';
  let query = '';
  let limit = 120;
  const dialog = new Dialog({
    title: '剪贴图',
    content: `<div class="b3-dialog__content ymz-local-asset-dialog ymz-clipart-dialog">
      <div class="ymz-clipart-search"><input class="b3-text-field" data-role="clipart-search" placeholder="搜索剪贴图"><span data-role="clipart-count"></span></div>
      <div class="ymz-asset-tabs ymz-asset-tabs--scroll" data-role="clipart-tabs"></div>
      <div class="ymz-clipart-grid" data-role="clipart-grid"></div>
      <button type="button" class="b3-button b3-button--outline ymz-clipart-more" data-action="clipart-more" hidden>加载更多</button>
    </div>`,
    width: '760px',
  });
  const search = dialog.element.querySelector<HTMLInputElement>('[data-role="clipart-search"]')!;
  const tabs = dialog.element.querySelector<HTMLElement>('[data-role="clipart-tabs"]')!;
  const grid = dialog.element.querySelector<HTMLElement>('[data-role="clipart-grid"]')!;
  const count = dialog.element.querySelector<HTMLElement>('[data-role="clipart-count"]')!;
  const more = dialog.element.querySelector<HTMLButtonElement>('[data-action="clipart-more"]')!;
  const render = (): void => {
    tabs.innerHTML = '';
    const all = document.createElement('button');
    all.type = 'button';
    all.className = `ymz-asset-tab${categoryId ? '' : ' is-active'}`;
    all.textContent = '全部';
    all.addEventListener('click', () => { categoryId = ''; limit = 120; render(); });
    tabs.appendChild(all);
    clipartCatalog.categories.forEach((category) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `ymz-asset-tab${category.id === categoryId ? ' is-active' : ''}`;
      button.textContent = category.label;
      button.addEventListener('click', () => { categoryId = category.id; limit = 120; render(); });
      tabs.appendChild(button);
    });
    const matches = searchClipart(query, categoryId || undefined);
    count.textContent = `${matches.length} 个`;
    grid.innerHTML = '';
    matches.slice(0, limit).forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ymz-clipart-option';
      button.title = item.label;
      const img = document.createElement('img');
      img.src = resolver.clipartUrl(item.relativePath);
      img.alt = item.label;
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
    more.hidden = matches.length <= limit;
  };
  search.addEventListener('input', () => { query = search.value; limit = 120; render(); });
  more.addEventListener('click', () => { limit += 120; render(); });
  render();
  search.focus();
}
