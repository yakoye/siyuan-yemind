import {
  getColorScheme,
  normalizeColorSchemeId,
  YEMIND_COLOR_SCHEMES,
} from '../core/colorSchemes';

export interface RainbowSchemePickerOptions {
  selected: string;
  readonly(): boolean;
  onSelect(value: string): void;
}

export class RainbowSchemePicker {
  private readonly trigger: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly label: HTMLElement | null;
  private readonly preview: HTMLElement | null;
  private readonly select: HTMLSelectElement | null;
  private selected: string;

  constructor(
    private readonly root: HTMLElement,
    private readonly options: RainbowSchemePickerOptions,
  ) {
    this.trigger = root.querySelector<HTMLButtonElement>('[data-rainbow-trigger]')!;
    this.panel = root.querySelector<HTMLElement>('[data-rainbow-picker]')!;
    this.label = root.querySelector<HTMLElement>('[data-rainbow-current-label]');
    this.preview = root.querySelector<HTMLElement>('[data-project-rainbow-preview]');
    this.select = root.querySelector<HTMLSelectElement>('[data-project-style="rainbowScheme"]');
    this.selected = normalizeColorSchemeId(options.selected) ?? 'rainbow';
    this.render();
    this.trigger.addEventListener('click', this.onTriggerClick);
    this.panel.addEventListener('click', this.onPanelClick);
    document.addEventListener('mousedown', this.onDocumentMouseDown, true);
    this.sync();
  }

  setSelected(value: string): void {
    this.selected = normalizeColorSchemeId(value) ?? 'rainbow';
    this.sync();
  }

  refreshReadonly(): void {
    const readonly = this.options.readonly();
    this.trigger.disabled = readonly;
    this.panel.querySelectorAll<HTMLButtonElement>('[data-rainbow-value]')
      .forEach((button) => { button.disabled = readonly; });
    if (readonly) this.hide();
  }

  hide(): void {
    this.panel.hidden = true;
    this.trigger.setAttribute('aria-expanded', 'false');
  }

  destroy(): void {
    this.trigger.removeEventListener('click', this.onTriggerClick);
    this.panel.removeEventListener('click', this.onPanelClick);
    document.removeEventListener('mousedown', this.onDocumentMouseDown, true);
  }

  private render(): void {
    this.panel.className = 'ymz-rainbow-picker';
    this.panel.setAttribute('role', 'listbox');
    this.panel.setAttribute('aria-label', '彩虹连线配色');
    this.panel.innerHTML = '';
    this.select?.replaceChildren();

    for (const category of ['缤纷', '经典'] as const) {
      const schemes = YEMIND_COLOR_SCHEMES.filter((scheme) => scheme.category === category);
      const group = document.createElement('section');
      group.className = 'ymz-rainbow-picker__group';
      group.dataset.rainbowGroup = category;
      const heading = document.createElement('h5');
      heading.textContent = category;
      const grid = document.createElement('div');
      grid.className = 'ymz-rainbow-picker__grid';
      for (const scheme of schemes) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ymz-rainbow-picker__option';
        button.dataset.rainbowValue = scheme.id;
        button.setAttribute('role', 'option');
        const name = document.createElement('strong');
        name.textContent = scheme.label;
        const colors = document.createElement('i');
        colors.setAttribute('aria-hidden', 'true');
        colors.style.background = `linear-gradient(90deg, ${scheme.colors.join(',')})`;
        button.append(name, colors);
        grid.appendChild(button);

        const option = document.createElement('option');
        option.value = scheme.id;
        option.textContent = scheme.label;
        this.select?.appendChild(option);
      }
      group.append(heading, grid);
      this.panel.appendChild(group);
    }
  }

  private sync(): void {
    const scheme = getColorScheme(this.selected) ?? getColorScheme('rainbow');
    if (!scheme) return;
    if (this.label) this.label.textContent = scheme.label;
    if (this.preview) {
      this.preview.style.background = `linear-gradient(90deg, ${scheme.colors.join(',')})`;
    }
    if (this.select) this.select.value = scheme.id;
    this.panel.querySelectorAll<HTMLButtonElement>('[data-rainbow-value]').forEach((button) => {
      const active = button.dataset.rainbowValue === scheme.id;
      button.classList.toggle('is-selected', active);
      button.setAttribute('aria-selected', String(active));
    });
    this.refreshReadonly();
  }

  private readonly onTriggerClick = (event: MouseEvent): void => {
    event.stopPropagation();
    if (this.options.readonly()) return;
    const show = this.panel.hidden;
    this.panel.hidden = !show;
    this.trigger.setAttribute('aria-expanded', String(show));
  };

  private readonly onPanelClick = (event: MouseEvent): void => {
    event.stopPropagation();
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-rainbow-value]');
    if (!button || button.disabled || this.options.readonly()) return;
    const value = normalizeColorSchemeId(button.dataset.rainbowValue);
    if (!value) return;
    this.selected = value;
    this.sync();
    this.options.onSelect(value);
    this.hide();
  };

  private readonly onDocumentMouseDown = (event: MouseEvent): void => {
    if (this.panel.hidden) return;
    const target = event.target as Node | null;
    if (target && this.root.contains(target)) return;
    this.hide();
  };
}
