import type { YeMindCommands } from '../core/commands';
import type { NodeStyleKey, NodeStylePatch } from '../editor/nodeStyle';
import { colorPaletteInnerHtml } from '../editor/colorPalette';
import { parseEditableColor, presentColor } from '../editor/colorPresentation';

const INPUT_EVENTS = ['keydown', 'keyup', 'beforeinput', 'input', 'paste', 'compositionstart', 'compositionupdate', 'compositionend'] as const;
type NodeColorKey = 'fillColor' | 'borderColor' | 'color';

function toInputValue(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function isNodeColorKey(value: string | undefined): value is NodeColorKey {
  return value === 'fillColor' || value === 'borderColor' || value === 'color';
}

export class NodeStylePanel {
  private readonly panel: HTMLElement | null;
  private readonly colorPopover: HTMLElement;
  private readonly customColorInput: HTMLInputElement;
  private current: NodeStylePatch = {};
  private activeColorKey: NodeColorKey = 'fillColor';

  constructor(private readonly root: HTMLElement, private readonly commands: YeMindCommands) {
    this.panel = root.querySelector<HTMLElement>('[data-role="node-style-panel"]');
    this.colorPopover = document.createElement('div');
    this.colorPopover.className = 'ymz-color-popover ymz-node-color-popover';
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
    this.panel.addEventListener('change', this.onChange);
    this.panel.addEventListener('input', this.onInput, true);
    INPUT_EVENTS.forEach((type) => this.panel?.addEventListener(type, this.stopEditorEvent));
    this.panel.addEventListener('pointerdown', this.stopEditorEvent);
    this.colorPopover.addEventListener('click', this.onColorPopoverClick);
    this.colorPopover.addEventListener('mousedown', this.onColorPopoverMouseDown);
    INPUT_EVENTS.forEach((type) => this.colorPopover.addEventListener(type, this.stopEditorEvent));
    this.customColorInput.addEventListener('input', this.onNativeColorInput);
    this.bindEditableColorInput('hex');
    this.bindEditableColorInput('rgb');
    document.addEventListener('mousedown', this.onDocumentMouseDown, true);
  }

  destroy(): void {
    if (this.panel) {
      this.panel.removeEventListener('click', this.onClick);
      this.panel.removeEventListener('change', this.onChange);
      this.panel.removeEventListener('input', this.onInput, true);
      INPUT_EVENTS.forEach((type) => this.panel?.removeEventListener(type, this.stopEditorEvent));
      this.panel.removeEventListener('pointerdown', this.stopEditorEvent);
    }
    this.colorPopover.removeEventListener('click', this.onColorPopoverClick);
    this.colorPopover.removeEventListener('mousedown', this.onColorPopoverMouseDown);
    INPUT_EVENTS.forEach((type) => this.colorPopover.removeEventListener(type, this.stopEditorEvent));
    this.customColorInput.removeEventListener('input', this.onNativeColorInput);
    document.removeEventListener('mousedown', this.onDocumentMouseDown, true);
    this.colorPopover.remove();
  }

  show(): void {
    if (!this.panel) return;
    this.refresh();
    this.panel.hidden = false;
  }

  hide(): void {
    if (this.panel) this.panel.hidden = true;
    this.colorPopover.hidden = true;
  }

  refresh(): void {
    if (!this.panel) return;
    this.current = this.commands.getActiveNodeStyle() ?? {};
    this.panel.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-node-style]').forEach((control) => {
      const key = control.dataset.nodeStyle as NodeStyleKey | undefined;
      if (!key) return;
      control.value = toInputValue(this.current[key]);
    });
    this.panel.querySelectorAll<HTMLButtonElement>('[data-node-style-toggle],[data-node-style-set]').forEach((button) => {
      const key = (button.dataset.nodeStyleToggle ?? button.dataset.nodeStyleSet) as NodeStyleKey | undefined;
      const value = button.dataset.nodeStyleValue;
      button.classList.toggle('is-active', Boolean(key && value && this.current[key] === value));
      button.setAttribute('aria-pressed', String(Boolean(key && value && this.current[key] === value)));
    });
    (['fillColor', 'borderColor', 'color'] as NodeColorKey[]).forEach((key) => this.syncColorTrigger(key));
    this.panel.dataset.readonly = String(this.commands.isReadonly());
    this.panel.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input,select,button').forEach((control) => {
      if (control.dataset.nodeStyleAction === 'close') return;
      control.disabled = this.commands.isReadonly();
    });
  }

  private readonly stopEditorEvent = (event: Event): void => event.stopPropagation();

  private readonly onDocumentMouseDown = (event: MouseEvent): void => {
    const target = event.target as Node | null;
    if (!target) return;
    if (!this.colorPopover.hidden && !this.colorPopover.contains(target)) this.colorPopover.hidden = true;
  };

  private readonly onColorPopoverMouseDown = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    const isTextInput = target instanceof HTMLInputElement && target.type !== 'color';
    if (!isTextInput) event.preventDefault();
    event.stopPropagation();
  };

  private applyControl(control: HTMLInputElement | HTMLSelectElement): void {
    const key = control.dataset.nodeStyle as NodeStyleKey | undefined;
    if (!key || this.commands.isReadonly()) return;
    this.commands.setActiveNodeStyle({ [key]: control.value || null });
    this.current = { ...this.current, [key]: control.value || null };
  }

  private applyColor(value: string | null, close = true): void {
    if (this.commands.isReadonly()) return;
    this.commands.setActiveNodeStyle({ [this.activeColorKey]: value });
    this.current = { ...this.current, [this.activeColorKey]: value };
    this.syncColorTrigger(this.activeColorKey);
    this.syncColorInputs();
    if (close) this.colorPopover.hidden = true;
  }

  private syncColorTrigger(key: NodeColorKey): void {
    if (!this.panel) return;
    const value = typeof this.current[key] === 'string' ? String(this.current[key]) : '';
    const swatch = this.panel.querySelector<HTMLElement>(`[data-node-color-swatch="${key}"]`);
    const label = this.panel.querySelector<HTMLElement>(`[data-node-color-label="${key}"]`);
    swatch?.style.setProperty('--ymz-current-color', value || 'transparent');
    if (label) label.textContent = value || '默认';
  }

  private syncColorInputs(): void {
    const value = this.current[this.activeColorKey];
    const presentation = presentColor(value);
    const editable = parseEditableColor(value);
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

  private openColorPopover(key: NodeColorKey, anchor: HTMLElement): void {
    this.activeColorKey = key;
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
      this.applyColor(parsed.hex, false);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this.colorPopover.hidden = true;
    });
  }

  private readonly onNativeColorInput = (): void => this.applyColor(this.customColorInput.value, false);

  private readonly onColorPopoverClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const swatch = target.closest<HTMLButtonElement>('[data-color-value]');
    if (swatch) {
      this.applyColor(swatch.dataset.colorValue || null);
      return;
    }
    const action = target.closest<HTMLButtonElement>('[data-color-action]')?.dataset.colorAction;
    if (action === 'reset') this.applyColor(null);
    if (action === 'custom') {
      const value = this.current[this.activeColorKey];
      this.customColorInput.value = typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000';
      this.customColorInput.click();
    }
  };

  private readonly onInput = (event: Event): void => {
    const control = (event.target as HTMLElement).closest<HTMLInputElement>('[data-node-style]');
    if (!control || control.type !== 'number') return;
    this.applyControl(control);
  };

  private readonly onChange = (event: Event): void => {
    const control = (event.target as HTMLElement).closest<HTMLInputElement | HTMLSelectElement>('[data-node-style]');
    if (control) this.applyControl(control);
  };

  private readonly onClick = (event: MouseEvent): void => {
    event.stopPropagation();
    const target = event.target as HTMLElement;
    const action = target.closest<HTMLElement>('[data-node-style-action]')?.dataset.nodeStyleAction;
    if (action === 'close') {
      this.hide();
      return;
    }
    const colorTrigger = target.closest<HTMLElement>('[data-node-color-trigger]');
    const colorKey = colorTrigger?.dataset.nodeColorTrigger;
    if (colorTrigger && isNodeColorKey(colorKey)) {
      this.openColorPopover(colorKey, colorTrigger);
      return;
    }
    if (this.commands.isReadonly()) return;
    if (action === 'fit-width') {
      this.commands.setActiveNodeStyle({ width: null });
      this.refresh();
      return;
    }
    if (action === 'reset') {
      this.commands.resetActiveNodeStyle();
      this.refresh();
      return;
    }
    const clear = target.closest<HTMLElement>('[data-node-style-clear]')?.dataset.nodeStyleClear as NodeStyleKey | undefined;
    if (clear) {
      this.commands.setActiveNodeStyle({ [clear]: null });
      this.refresh();
      return;
    }
    const toggle = target.closest<HTMLElement>('[data-node-style-toggle]');
    if (toggle) {
      const key = toggle.dataset.nodeStyleToggle as NodeStyleKey;
      const expected = toggle.dataset.nodeStyleValue ?? '';
      this.commands.setActiveNodeStyle({ [key]: this.current[key] === expected ? null : expected });
      this.refresh();
      return;
    }
    const set = target.closest<HTMLElement>('[data-node-style-set]');
    if (set) {
      const key = set.dataset.nodeStyleSet as NodeStyleKey;
      this.commands.setActiveNodeStyle({ [key]: set.dataset.nodeStyleValue ?? null });
      this.refresh();
    }
  };
}
