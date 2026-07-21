import type { ProjectStyle } from '../editor/projectStyle';
import { normalizeProjectStyle } from '../editor/projectStyle';

const BLOCKED_EVENTS = ['keydown', 'keyup', 'beforeinput', 'input', 'paste', 'compositionstart', 'compositionupdate', 'compositionend'] as const;

export class ProjectStylePanel {
  private readonly panel: HTMLElement | null;
  private style: ProjectStyle;

  constructor(
    private readonly root: HTMLElement,
    initial: ProjectStyle,
    private readonly readonly: () => boolean,
    private readonly onChange: (style: ProjectStyle) => void,
  ) {
    this.style = normalizeProjectStyle(initial);
    this.panel = root.querySelector<HTMLElement>('[data-role="project-style-panel"]');
    if (!this.panel) return;
    this.panel.addEventListener('click', this.onClick);
    this.panel.addEventListener('change', this.onControl);
    this.panel.addEventListener('input', this.onControl);
    BLOCKED_EVENTS.forEach((type) => this.panel?.addEventListener(type, this.stop, true));
    document.addEventListener('mousedown', this.onDocumentMouseDown, true);
    this.refresh();
  }

  destroy(): void {
    if (!this.panel) return;
    this.panel.removeEventListener('click', this.onClick);
    this.panel.removeEventListener('change', this.onControl);
    this.panel.removeEventListener('input', this.onControl);
    BLOCKED_EVENTS.forEach((type) => this.panel?.removeEventListener(type, this.stop, true));
    document.removeEventListener('mousedown', this.onDocumentMouseDown, true);
  }

  show(): void {
    if (!this.panel) return;
    this.refresh();
    this.panel.hidden = false;
  }

  hide(): void {
    if (this.panel) this.panel.hidden = true;
  }

  setStyle(style: ProjectStyle): void {
    this.style = normalizeProjectStyle(style);
    this.refresh();
  }

  private readonly stop = (event: Event): void => event.stopPropagation();

  private readonly onDocumentMouseDown = (event: MouseEvent): void => {
    if (!this.panel || this.panel.hidden) return;
    const target = event.target as Node | null;
    if (target && this.panel.contains(target)) return;
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
    if (horizontal) horizontal.value = String(this.style.customMarginX ?? 42);
    if (vertical) vertical.value = String(this.style.customMarginY ?? 11);
    const rainbow = this.panel.querySelector<HTMLInputElement>('[data-project-style="rainbowLines"]');
    if (rainbow) {
      rainbow.checked = this.style.rainbowLines === true;
      rainbow.indeterminate = this.style.rainbowLines === null;
    }
    const background = this.panel.querySelector<HTMLInputElement>('[data-project-style="backgroundColor"]');
    if (background) background.value = this.style.backgroundColor ?? '#f8fafc';
    this.panel.querySelectorAll<HTMLButtonElement>('[data-project-background]').forEach((button) => {
      button.classList.toggle('is-active', (button.dataset.projectBackground || null) === this.style.backgroundColor);
    });
    this.panel.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input,button').forEach((control) => {
      if (control.dataset.projectStyleAction === 'close') return;
      control.disabled = this.readonly();
    });
  }

  private readonly onControl = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    if (target.dataset.projectStyle === 'rainbowLines') {
      this.commit({ rainbowLines: target.checked });
    } else if (target.dataset.projectStyle === 'backgroundColor') {
      this.commit({ backgroundColor: target.value });
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
    if (action === 'close') return this.hide();
    if (action === 'reset') {
      this.commit({ density: 'default', rainbowLines: null, backgroundColor: null, customMarginX: undefined, customMarginY: undefined });
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
