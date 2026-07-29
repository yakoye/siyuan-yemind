import { SYMBOL_SECTIONS, searchSymbols } from '../content/symbolCatalog';

export interface SymbolPickerOptions {
  canInsert(): boolean;
  onInsert(symbol: string): boolean;
}

export class SymbolPicker {
  private readonly element: HTMLElement;
  private readonly search: HTMLInputElement;
  private readonly tabs: HTMLElement;
  private readonly body: HTMLElement;
  private activeSection = '';
  private drag: { pointerId: number; dx: number; dy: number } | null = null;

  constructor(private readonly root: HTMLElement, private readonly options: SymbolPickerOptions) {
    this.element = document.createElement('aside');
    this.element.className = 'ymz-symbol-picker';
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-label', '符号');
    this.element.innerHTML = `
      <header data-symbol-drag-handle><strong><span aria-hidden="true">Ω</span> 符号</strong><button type="button" data-symbol-action="close" aria-label="关闭符号">×</button></header>
      <label class="ymz-symbol-picker__search"><input type="search" data-symbol-search placeholder="搜索符号或分类" aria-label="搜索符号"></label>
      <nav class="ymz-symbol-picker__tabs" data-symbol-tabs aria-label="符号分类"></nav>
      <div class="ymz-symbol-picker__body" data-symbol-body></div>`;
    this.search = this.element.querySelector('[data-symbol-search]')!;
    this.tabs = this.element.querySelector('[data-symbol-tabs]')!;
    this.body = this.element.querySelector('[data-symbol-body]')!;
    this.root.appendChild(this.element);
    this.element.querySelector('[data-symbol-action="close"]')?.addEventListener('click', () => this.hide());
    this.search.addEventListener('input', () => this.renderBody());
    this.tabs.addEventListener('click', this.onTabClick);
    this.body.addEventListener('click', this.onSymbolClick);
    this.element.querySelector<HTMLElement>('[data-symbol-drag-handle]')?.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    this.renderTabs();
    this.renderBody();
  }

  show(): void {
    this.element.hidden = false;
    this.clamp();
    this.search.focus();
  }

  hide(): void {
    this.element.hidden = true;
  }

  destroy(): void {
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    this.element.remove();
  }

  private renderTabs(): void {
    this.tabs.innerHTML = '';
    [{ id: '', label: '全部' }, ...SYMBOL_SECTIONS].forEach(({ id, label }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.symbolSection = id;
      button.className = id === this.activeSection ? 'is-active' : '';
      button.textContent = label;
      this.tabs.appendChild(button);
    });
  }

  private renderBody(): void {
    this.body.innerHTML = '';
    const groups = searchSymbols(this.search.value, this.activeSection);
    groups.forEach((group) => {
      const section = document.createElement('section');
      const heading = document.createElement('h4');
      heading.textContent = group.label;
      const grid = document.createElement('div');
      grid.className = 'ymz-symbol-picker__grid';
      group.symbols.forEach((symbol) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.symbolValue = symbol;
        button.textContent = symbol;
        button.title = `插入 ${symbol}`;
        button.disabled = !this.options.canInsert();
        grid.appendChild(button);
      });
      section.append(heading, grid);
      this.body.appendChild(section);
    });
    if (groups.length === 0) this.body.textContent = '没有匹配的符号';
  }

  private readonly onTabClick = (event: Event): void => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-symbol-section]');
    if (!button) return;
    this.activeSection = button.dataset.symbolSection ?? '';
    this.renderTabs();
    this.renderBody();
  };

  private readonly onSymbolClick = (event: Event): void => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-symbol-value]');
    if (!button || button.disabled) return;
    if (this.options.onInsert(button.dataset.symbolValue ?? '')) {
      button.classList.add('is-inserted');
      window.setTimeout(() => button.classList.remove('is-inserted'), 180);
      this.renderBody();
    }
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if ((event.target as HTMLElement).closest('button,input')) return;
    const rect = this.element.getBoundingClientRect();
    this.drag = { pointerId: event.pointerId, dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    this.element.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.drag || this.drag.pointerId !== event.pointerId) return;
    const rootRect = this.root.getBoundingClientRect();
    const rect = this.element.getBoundingClientRect();
    const left = Math.min(rootRect.width - rect.width - 8, Math.max(8, event.clientX - rootRect.left - this.drag.dx));
    const top = Math.min(rootRect.height - rect.height - 8, Math.max(8, event.clientY - rootRect.top - this.drag.dy));
    this.element.style.left = `${Math.round(left)}px`;
    this.element.style.top = `${Math.round(top)}px`;
    this.element.style.right = 'auto';
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.drag?.pointerId === event.pointerId) this.drag = null;
  };

  private clamp(): void {
    if (this.element.style.left) return;
    this.element.style.right = '16px';
    this.element.style.top = '58px';
  }
}
