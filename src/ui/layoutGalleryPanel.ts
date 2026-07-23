import { createRuntimeAssetResolver, groupLayouts } from '../core/localAssetCatalogs';
import { getLayoutAssetPreset, normalizeLayoutAssetId } from '../core/layoutAssetPresets';

export class LayoutGalleryPanel {
  private readonly panel: HTMLElement;
  private readonly resolver;
  private selectedId: string;
  private readonly onDocumentMouseDown = (event: MouseEvent): void => {
    if (this.panel.hidden) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (!this.panel.contains(target)) this.hide();
  };

  constructor(
    private readonly root: HTMLElement,
    pluginBaseUrl: string | undefined,
    initialId: string | undefined,
    private readonly readonly: () => boolean,
    private readonly onSelect: (id: string, engineLayout: string) => void,
  ) {
    this.panel = root.querySelector<HTMLElement>('[data-role="layout-gallery-panel"]')!;
    this.resolver = createRuntimeAssetResolver(pluginBaseUrl);
    this.selectedId = normalizeLayoutAssetId(initialId);
    this.panel.querySelector('[data-layout-gallery-action="close"]')?.addEventListener('click', () => this.hide());
    document.addEventListener('mousedown', this.onDocumentMouseDown);
    this.render();
  }

  setSelected(id: string | undefined): void {
    this.selectedId = normalizeLayoutAssetId(id);
    this.render();
  }

  toggle(anchor: HTMLElement): void {
    if (!this.panel.hidden) { this.hide(); return; }
    this.show(anchor);
  }

  show(anchor: HTMLElement): void {
    const rootRect = this.root.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    this.panel.hidden = false;
    const width = Math.min(520, Math.max(360, rootRect.width - 24));
    this.panel.style.width = `${width}px`;
    const maxLeft = Math.max(8, rootRect.width - width - 8);
    this.panel.style.left = `${Math.min(maxLeft, Math.max(8, anchorRect.left - rootRect.left))}px`;
    this.panel.style.top = `${Math.max(8, anchorRect.bottom - rootRect.top + 6)}px`;
  }

  hide(): void { this.panel.hidden = true; }

  destroy(): void {
    document.removeEventListener('mousedown', this.onDocumentMouseDown);
    this.panel.remove();
  }

  private render(): void {
    const body = this.panel.querySelector<HTMLElement>('[data-role="layout-gallery-body"]');
    if (!body) return;
    body.innerHTML = '';
    groupLayouts().forEach((group) => {
      const section = document.createElement('section');
      section.className = 'ymz-layout-gallery__group';
      const title = document.createElement('h4');
      title.textContent = group.label;
      const grid = document.createElement('div');
      grid.className = 'ymz-layout-gallery__grid';
      group.items.forEach((item) => {
        const preset = getLayoutAssetPreset(item.id);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `ymz-layout-gallery__item${item.id === this.selectedId ? ' is-selected' : ''}`;
        button.title = item.title;
        button.disabled = this.readonly();
        const image = document.createElement('img');
        image.src = this.resolver.layoutUrl(item.relativePath);
        image.alt = item.title;
        image.draggable = false;
        const label = document.createElement('span');
        label.textContent = item.title;
        button.append(image, label);
        button.addEventListener('click', () => {
          if (this.readonly()) return;
          this.selectedId = item.id;
          this.onSelect(item.id, preset.engineLayout);
          this.render();
          this.hide();
        });
        grid.appendChild(button);
      });
      section.append(title, grid);
      body.appendChild(section);
    });
  }
}
