import type { ProjectStyle } from '../editor/projectStyle';
import { densitySpacing, normalizeProjectStyle } from '../editor/projectStyle';
import { colorPaletteInnerHtml } from '../editor/colorPalette';
import { parseEditableColor, presentColor } from '../editor/colorPresentation';
import { getColorScheme, normalizeColorSchemeId } from '../core/colorSchemes';

const BLOCKED_EVENTS = ['keydown', 'keyup', 'beforeinput', 'input', 'paste', 'compositionstart', 'compositionupdate', 'compositionend'] as const;

export class ProjectStylePanel {
  private readonly panel: HTMLElement | null;
  private readonly colorPopover: HTMLElement;
  private readonly customColorInput: HTMLInputElement;
  private style: ProjectStyle;

  constructor(
    private readonly root: HTMLElement,
    initial: ProjectStyle,
    private readonly readonly: () => boolean,
    private readonly onChange: (style: ProjectStyle) => void,
  ) {
    this.style = normalizeProjectStyle(initial);
    this.panel = root.querySelector<HTMLElement>('[data-role="project-style-panel"]');
    this.colorPopover = document.createElement('div');
    this.colorPopover.className = 'ymz-color-popover ymz-project-color-popover';
    this.colorPopover.hidden = true;
    this.colorPopover.innerHTML = colorPaletteInnerHtml();
    this.customColorInput = document.createElement('input');
    this.customColorInput.type = 'color';
    this.customColorInput.className = 'ymz-color-popover__native';
    this.customColorInput.tabIndex = -1;
    this.customColorInput.setAttribute('aria-hidden', 'true');
    this.colorPopover.appendChild(this.customColorInput);
    root.appendChild(this.colorPopover);
    if (!this.panel) return;
    this.panel.addEventListener('click', this.onClick);
    this.panel.addEventListener('change', this.onControl);
    this.panel.addEventListener('input', this.onControl);
    BLOCKED_EVENTS.forEach((type) => this.panel?.addEventListener(type, this.stop));
    this.panel.addEventListener('pointerdown', this.stop);
    this.colorPopover.addEventListener('click', this.onColorPopoverClick);
    this.colorPopover.addEventListener('mousedown', this.onColorPopoverMouseDown);
    BLOCKED_EVENTS.forEach((type) => this.colorPopover.addEventListener(type, this.stop));
    this.customColorInput.addEventListener('input', this.onNativeColorInput);
    this.bindEditableColorInput('hex');
    this.bindEditableColorInput('rgb');
    document.addEventListener('mousedown', this.onDocumentMouseDown, true);
    this.refresh();
  }

  destroy(): void {
    if (!this.panel) return;
    this.panel.removeEventListener('click', this.onClick);
    this.panel.removeEventListener('change', this.onControl);
    this.panel.removeEventListener('input', this.onControl);
    BLOCKED_EVENTS.forEach((type) => this.panel?.removeEventListener(type, this.stop));
    this.panel.removeEventListener('pointerdown', this.stop);
    this.colorPopover.removeEventListener('click', this.onColorPopoverClick);
    this.colorPopover.removeEventListener('mousedown', this.onColorPopoverMouseDown);
    BLOCKED_EVENTS.forEach((type) => this.colorPopover.removeEventListener(type, this.stop));
    this.customColorInput.removeEventListener('input', this.onNativeColorInput);
    document.removeEventListener('mousedown', this.onDocumentMouseDown, true);
    this.colorPopover.remove();
  }

  isVisible(): boolean {
    return Boolean(this.panel && !this.panel.hidden);
  }

  toggle(anchor?: HTMLElement | { x: number; y: number }): void {
    if (this.isVisible()) this.hide();
    else this.show(anchor);
  }

  show(anchor?: HTMLElement | { x: number; y: number }): void {
    if (!this.panel) return;
    this.refresh();
    this.panel.hidden = false;
    this.position(anchor);
  }

  private position(anchor?: HTMLElement | { x: number; y: number }): void {
    if (!this.panel) return;
    const rootRect = this.root.getBoundingClientRect();
    const width = this.panel.offsetWidth || 400;
    const height = this.panel.offsetHeight || 480;
    let x = rootRect.right - width - 12;
    let y = rootRect.top + 58;
    if (anchor instanceof HTMLElement) {
      const rect = anchor.getBoundingClientRect();
      x = rect.left;
      y = rect.bottom + 6;
    } else if (anchor) {
      x = anchor.x;
      y = anchor.y + 6;
    }
    const localX = Math.max(8, Math.min(x - rootRect.left, rootRect.width - width - 8));
    const localY = Math.max(8, Math.min(y - rootRect.top, rootRect.height - Math.min(height, rootRect.height - 16) - 8));
    this.panel.style.left = `${Math.round(localX)}px`;
    this.panel.style.top = `${Math.round(localY)}px`;
    this.panel.style.right = 'auto';
  }

  hide(): void {
    if (this.panel) this.panel.hidden = true;
    this.colorPopover.hidden = true;
  }

  setStyle(style: ProjectStyle): void {
    this.style = normalizeProjectStyle(style);
    this.refresh();
  }

  private readonly stop = (event: Event): void => event.stopPropagation();

  private readonly onDocumentMouseDown = (event: MouseEvent): void => {
    if (!this.panel || this.panel.hidden) return;
    const target = event.target as Node | null;
    if (target && this.colorPopover.contains(target)) return;
    if (target && this.panel.contains(target)) {
      this.colorPopover.hidden = true;
      return;
    }
    this.hide();
  };

  private commit(patch: Partial<ProjectStyle>): void {
    if (this.readonly()) return;
    this.style = normalizeProjectStyle({ ...this.style, ...patch });
    this.onChange(this.style);
    this.refresh();
  }

  private refresh(): void {
    if (!this.panel) return;
    this.panel.querySelectorAll<HTMLButtonElement>('[data-project-density]').forEach((button) => {
      const active = button.dataset.projectDensity === this.style.density;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const horizontal = this.panel.querySelector<HTMLInputElement>('[data-project-spacing="horizontal"]');
    const vertical = this.panel.querySelector<HTMLInputElement>('[data-project-spacing="vertical"]');
    const presetSpacing = densitySpacing(this.style.density, this.style.customMarginX, this.style.customMarginY).node;
    if (horizontal) horizontal.value = String(this.style.customMarginX ?? presetSpacing?.marginX ?? 42);
    if (vertical) vertical.value = String(this.style.customMarginY ?? presetSpacing?.marginY ?? 11);
    const rainbow = this.panel.querySelector<HTMLInputElement>('[data-project-style="rainbowLines"]');
    if (rainbow) {
      rainbow.checked = this.style.rainbowLines === true;
      rainbow.indeterminate = this.style.rainbowLines === null;
    }
    const rainbowScheme = this.panel.querySelector<HTMLSelectElement>('[data-project-style="rainbowScheme"]');
    const selectedScheme = normalizeColorSchemeId(this.style.rainbowScheme) ?? 'rainbow';
    if (rainbowScheme) rainbowScheme.value = selectedScheme;
    const rainbowPreview = this.panel.querySelector<HTMLElement>('[data-project-rainbow-preview]');
    const colors = getColorScheme(selectedScheme)?.colors ?? [];
    if (rainbowPreview) rainbowPreview.style.background = colors.length ? `linear-gradient(90deg, ${colors.join(',')})` : '';
    this.syncBackgroundTrigger();
    this.panel.querySelectorAll<HTMLButtonElement>('[data-project-background]').forEach((button) => {
      button.classList.toggle('is-active', (button.dataset.projectBackground || null) === this.style.backgroundColor);
    });
    this.panel.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input,button').forEach((control) => {
      if (control.dataset.projectStyleAction === 'close') return;
      control.disabled = this.readonly();
    });
  }

  private syncBackgroundTrigger(): void {
    if (!this.panel) return;
    const value = this.style.backgroundColor ?? '';
    const swatch = this.panel.querySelector<HTMLElement>('[data-project-color-swatch="backgroundColor"]');
    const label = this.panel.querySelector<HTMLElement>('[data-project-color-label="backgroundColor"]');
    swatch?.style.setProperty('--ymz-current-color', value || 'transparent');
    if (label) label.textContent = value || '默认';
  }

  private syncColorInputs(): void {
    const presentation = presentColor(this.style.backgroundColor);
    const editable = parseEditableColor(this.style.backgroundColor);
    const hex = this.colorPopover.querySelector<HTMLInputElement>('[data-color-input="hex"]');
    const rgb = this.colorPopover.querySelector<HTMLInputElement>('[data-color-input="rgb"]');
    if (hex) {
      hex.value = editable?.hex ?? '';
      hex.setAttribute('aria-invalid', 'false');
    }
    if (rgb) {
      rgb.value = editable?.rgb ?? '';
      rgb.setAttribute('aria-invalid', 'false');
    }
    const hexReadout = this.colorPopover.querySelector<HTMLElement>('[data-color-readout="hex"]');
    const rgbReadout = this.colorPopover.querySelector<HTMLElement>('[data-color-readout="rgb"]');
    if (hexReadout) hexReadout.textContent = presentation.hex;
    if (rgbReadout) rgbReadout.textContent = presentation.rgb;
  }

  private applyBackgroundColor(value: string | null, close = true): void {
    this.commit({ backgroundColor: value });
    this.syncColorInputs();
    if (close) this.colorPopover.hidden = true;
  }

  private openColorPopover(anchor: HTMLElement): void {
    this.syncColorInputs();
    this.colorPopover.hidden = false;
    const rootRect = this.root.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const width = this.colorPopover.offsetWidth || 318;
    const height = this.colorPopover.offsetHeight || 260;
    const rootWidth = this.root.clientWidth || rootRect.width || window.innerWidth;
    const rootHeight = this.root.clientHeight || rootRect.height || window.innerHeight;
    const left = Math.max(8, Math.min(anchorRect.left - rootRect.left, rootWidth - width - 8));
    const below = anchorRect.bottom - rootRect.top + 6;
    const above = anchorRect.top - rootRect.top - height - 6;
    const top = below + height <= rootHeight - 8 ? below : Math.max(8, above);
    this.colorPopover.style.left = `${Math.round(left)}px`;
    this.colorPopover.style.top = `${Math.round(top)}px`;
  }

  private bindEditableColorInput(kind: 'hex' | 'rgb'): void {
    const input = this.colorPopover.querySelector<HTMLInputElement>(`[data-color-input="${kind}"]`);
    if (!input) return;
    input.addEventListener('input', () => {
      const parsed = parseEditableColor(input.value);
      input.setAttribute('aria-invalid', parsed ? 'false' : 'true');
      if (!parsed) return;
      const other = this.colorPopover.querySelector<HTMLInputElement>(`[data-color-input="${kind === 'hex' ? 'rgb' : 'hex'}"]`);
      if (other) {
        other.value = kind === 'hex' ? parsed.rgb : parsed.hex;
        other.setAttribute('aria-invalid', 'false');
      }
      this.applyBackgroundColor(parsed.hex, false);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.colorPopover.hidden = true;
    });
  }

  private readonly onColorPopoverMouseDown = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    const isTextInput = target instanceof HTMLInputElement && target.type !== 'color';
    if (!isTextInput) event.preventDefault();
    event.stopPropagation();
  };

  private readonly onNativeColorInput = (): void => this.applyBackgroundColor(this.customColorInput.value, false);

  private readonly onColorPopoverClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const swatch = target.closest<HTMLButtonElement>('[data-color-value]');
    if (swatch) {
      this.applyBackgroundColor(swatch.dataset.colorValue || null);
      return;
    }
    const action = target.closest<HTMLButtonElement>('[data-color-action]')?.dataset.colorAction;
    if (action === 'reset') this.applyBackgroundColor(null);
    if (action === 'custom') {
      const value = this.style.backgroundColor;
      this.customColorInput.value = typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
      this.customColorInput.click();
    }
  };

  private readonly onControl = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    if (target.dataset.projectStyle === 'rainbowLines') {
      this.commit({ rainbowLines: target.checked });
    } else if (target.dataset.projectStyle === 'rainbowScheme') {
      this.commit({ rainbowScheme: target.value, rainbowLines: true });
    } else if (target.dataset.projectSpacing) {
      const horizontal = this.panel?.querySelector<HTMLInputElement>('[data-project-spacing="horizontal"]');
      const vertical = this.panel?.querySelector<HTMLInputElement>('[data-project-spacing="vertical"]');
      this.commit({
        density: 'custom',
        customMarginX: Number(horizontal?.value),
        customMarginY: Number(vertical?.value),
      });
    }
  };

  private readonly onClick = (event: MouseEvent): void => {
    event.stopPropagation();
    const target = event.target as HTMLElement;
    const action = target.closest<HTMLElement>('[data-project-style-action]')?.dataset.projectStyleAction;
    const colorTrigger = target.closest<HTMLElement>('[data-project-color-trigger]');
    if (colorTrigger) {
      this.openColorPopover(colorTrigger);
      return;
    }
    if (action === 'close') return this.hide();
    if (action === 'reset') {
      this.commit({ density: 'default', rainbowLines: null, rainbowScheme: null, backgroundColor: null, customMarginX: undefined, customMarginY: undefined });
      return;
    }
    const density = target.closest<HTMLElement>('[data-project-density]')?.dataset.projectDensity as ProjectStyle['density'] | undefined;
    if (density) {
      this.commit({ density });
      return;
    }
    const background = target.closest<HTMLElement>('[data-project-background]')?.dataset.projectBackground;
    if (background !== undefined) this.commit({ backgroundColor: background || null });
  };
}
