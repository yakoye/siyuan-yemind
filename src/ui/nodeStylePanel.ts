import type { YeMindCommands } from '../core/commands';
import type { NodeStyleKey, NodeStylePatch } from '../editor/nodeStyle';

const INPUT_EVENTS = ['keydown', 'keyup', 'beforeinput', 'input', 'paste', 'compositionstart', 'compositionupdate', 'compositionend'] as const;

function toInputValue(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

export class NodeStylePanel {
  private readonly panel: HTMLElement | null;
  private current: NodeStylePatch = {};

  constructor(private readonly root: HTMLElement, private readonly commands: YeMindCommands) {
    this.panel = root.querySelector<HTMLElement>('[data-role="node-style-panel"]');
    if (!this.panel) return;
    this.panel.addEventListener('click', this.onClick);
    this.panel.addEventListener('change', this.onChange);
    this.panel.addEventListener('input', this.onInput, true);
    INPUT_EVENTS.forEach((type) => this.panel?.addEventListener(type, this.stopEditorEvent, true));
    this.panel.addEventListener('pointerdown', this.stopEditorEvent, true);
  }

  destroy(): void {
    if (!this.panel) return;
    this.panel.removeEventListener('click', this.onClick);
    this.panel.removeEventListener('change', this.onChange);
    this.panel.removeEventListener('input', this.onInput, true);
    INPUT_EVENTS.forEach((type) => this.panel?.removeEventListener(type, this.stopEditorEvent, true));
    this.panel.removeEventListener('pointerdown', this.stopEditorEvent, true);
  }

  show(): void {
    if (!this.panel) return;
    this.refresh();
    this.panel.hidden = false;
  }

  hide(): void {
    if (this.panel) this.panel.hidden = true;
  }

  refresh(): void {
    if (!this.panel) return;
    this.current = this.commands.getActiveNodeStyle() ?? {};
    this.panel.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-node-style]').forEach((control) => {
      const key = control.dataset.nodeStyle as NodeStyleKey | undefined;
      if (!key) return;
      const value = this.current[key];
      if (control.type === 'color') {
        if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) control.value = value;
        return;
      }
      control.value = toInputValue(value);
    });
    this.panel.querySelectorAll<HTMLButtonElement>('[data-node-style-toggle],[data-node-style-set]').forEach((button) => {
      const key = (button.dataset.nodeStyleToggle ?? button.dataset.nodeStyleSet) as NodeStyleKey | undefined;
      const value = button.dataset.nodeStyleValue;
      button.classList.toggle('is-active', Boolean(key && value && this.current[key] === value));
      button.setAttribute('aria-pressed', String(Boolean(key && value && this.current[key] === value)));
    });
    this.panel.dataset.readonly = String(this.commands.isReadonly());
    this.panel.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('input,select,button').forEach((control) => {
      if (control.dataset.nodeStyleAction === 'close') return;
      control.disabled = this.commands.isReadonly();
    });
  }

  private readonly stopEditorEvent = (event: Event): void => {
    event.stopPropagation();
  };

  private applyControl(control: HTMLInputElement | HTMLSelectElement): void {
    const key = control.dataset.nodeStyle as NodeStyleKey | undefined;
    if (!key || this.commands.isReadonly()) return;
    this.commands.setActiveNodeStyle({ [key]: control.value || null });
    this.current = { ...this.current, [key]: control.value || null };
  }

  private readonly onInput = (event: Event): void => {
    const control = (event.target as HTMLElement).closest<HTMLInputElement>('[data-node-style]');
    if (!control || (control.type !== 'color' && control.type !== 'number')) return;
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
