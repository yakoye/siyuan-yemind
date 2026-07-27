export interface ProjectChoiceOption {
  value: string;
  label: string;
  group?: string;
  description?: string;
  iconHtml?: string;
  previewColor?: string;
  previewColors?: readonly string[];
}

export interface ProjectChoicePanelOptions {
  role: string;
  title: string;
  options: readonly ProjectChoiceOption[];
  presentation?: 'list' | 'palette';
  selected: string;
  readonly(): boolean;
  onSelect(value: string): void;
}

export class ProjectChoicePanel {
  private readonly panel: HTMLElement;
  private readonly body: HTMLElement;
  private selected: string;
  private activeGroup = '';
  private anchor: HTMLElement | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly config: ProjectChoicePanelOptions,
  ) {
    this.panel = root.querySelector<HTMLElement>(`[data-role="${config.role}"]`)!;
    this.body = this.panel.querySelector<HTMLElement>('[data-project-choice-body]')!;
    this.selected = config.selected;
    this.activeGroup = this.groupForValue(config.selected) ?? this.groups()[0] ?? '';
    this.panel.classList.toggle('is-palette', config.presentation === 'palette');
    this.panel.querySelector('[data-project-choice-action="close"]')?.addEventListener('click', () => this.hide());
    this.panel.addEventListener('click', this.onPanelClick);
    document.addEventListener('mousedown', this.onDocumentMouseDown, true);
    this.render();
  }

  isVisible(): boolean { return !this.panel.hidden; }

  setSelected(value: string): void {
    this.selected = value;
    this.activeGroup = this.groupForValue(value) ?? this.activeGroup;
    this.render();
  }

  refreshReadonly(): void { this.render(); }

  toggle(anchor: HTMLElement): void {
    if (this.isVisible()) this.hide();
    else this.show(anchor);
  }

  show(anchor: HTMLElement): void {
    this.anchor = anchor;
    this.activeGroup = this.groupForValue(this.selected) ?? this.activeGroup;
    this.render();
    this.panel.hidden = false;
    anchor.classList.add('is-active');
    anchor.setAttribute('aria-expanded', 'true');
    const rootRect = this.root.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const width = this.panel.offsetWidth || (this.config.presentation === 'palette' ? 390 : 260);
    const height = this.panel.offsetHeight || 360;
    const left = Math.max(8, Math.min(anchorRect.left - rootRect.left, rootRect.width - width - 8));
    const below = anchorRect.bottom - rootRect.top + 6;
    const above = anchorRect.top - rootRect.top - height - 6;
    const top = below + height <= rootRect.height - 8 ? below : Math.max(8, above);
    this.panel.style.left = `${Math.round(left)}px`;
    this.panel.style.top = `${Math.round(top)}px`;
  }

  hide(): void {
    this.panel.hidden = true;
    this.anchor?.classList.remove('is-active');
    this.anchor?.setAttribute('aria-expanded', 'false');
    this.anchor = null;
  }

  destroy(): void {
    document.removeEventListener('mousedown', this.onDocumentMouseDown, true);
    this.panel.removeEventListener('click', this.onPanelClick);
    this.panel.remove();
  }

  private readonly onDocumentMouseDown = (event: MouseEvent): void => {
    if (this.panel.hidden) return;
    const target = event.target as Node | null;
    if (target && (this.panel.contains(target) || this.anchor?.contains(target))) return;
    this.hide();
  };

  private readonly onPanelClick = (event: MouseEvent): void => {
    event.stopPropagation();
    const target = event.target as HTMLElement;
    const tab = target.closest<HTMLButtonElement>('[data-project-choice-group]');
    if (tab) {
      const group = tab.dataset.projectChoiceGroup ?? '';
      if (group && group !== this.activeGroup) {
        this.activeGroup = group;
        this.render();
      }
      return;
    }
    const button = target.closest<HTMLButtonElement>('[data-project-choice-value]');
    if (!button || button.disabled || this.config.readonly()) return;
    const value = button.dataset.projectChoiceValue ?? '';
    if (!value) return;
    this.selected = value;
    this.config.onSelect(value);
    this.render();
    this.hide();
  };

  private groups(): string[] {
    return [...new Set(this.config.options.map((option) => option.group ?? '').filter(Boolean))];
  }

  private groupForValue(value: string): string | undefined {
    return this.config.options.find((option) => option.value === value)?.group ?? undefined;
  }

  private render(): void {
    this.body.innerHTML = '';
    if (this.config.presentation === 'palette') this.renderPalette();
    else this.renderList();
  }

  private renderPalette(): void {
    const groups = this.groups();
    if (!this.activeGroup || !groups.includes(this.activeGroup)) {
      this.activeGroup = this.groupForValue(this.selected) ?? groups[0] ?? '';
    }

    const tabs = document.createElement('div');
    tabs.className = 'ymz-project-choice-panel__tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', `${this.config.title}分类`);
    groups.forEach((group) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `ymz-project-choice-panel__tab${group === this.activeGroup ? ' is-active' : ''}`;
      button.dataset.projectChoiceGroup = group;
      button.textContent = group;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(group === this.activeGroup));
      tabs.appendChild(button);
    });

    const grid = document.createElement('div');
    grid.className = 'ymz-project-choice-panel__palette-grid';
    grid.setAttribute('role', 'listbox');
    grid.setAttribute('aria-label', `${this.activeGroup || this.config.title}主题`);
    const options = this.config.options.filter((option) => (option.group ?? '') === this.activeGroup);
    options.forEach((option) => {
      const selected = option.value === this.selected;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `ymz-project-choice-panel__palette-item${selected ? ' is-selected' : ''}`;
      button.dataset.projectChoiceValue = option.value;
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(selected));
      button.setAttribute('aria-label', option.label);
      button.disabled = this.config.readonly();

      const label = document.createElement('strong');
      label.className = 'ymz-project-choice-panel__palette-label';
      label.textContent = option.label;

      const strip = document.createElement('span');
      strip.className = 'ymz-project-choice-panel__palette-strip';
      strip.setAttribute('aria-hidden', 'true');
      const colors = [...(option.previewColors ?? [])].slice(0, 6);
      const fallback = colors[colors.length - 1] ?? option.previewColor ?? 'var(--b3-theme-primary)';
      while (colors.length < 6) colors.push(fallback);
      colors.forEach((color) => {
        const block = document.createElement('i');
        block.className = 'ymz-project-choice-panel__palette-block';
        block.style.backgroundColor = color;
        strip.appendChild(block);
      });
      button.append(label, strip);
      grid.appendChild(button);
    });

    this.body.append(tabs, grid);
  }

  private renderList(): void {
    const groups = new Map<string, ProjectChoiceOption[]>();
    this.config.options.forEach((option) => {
      const key = option.group ?? '';
      const items = groups.get(key) ?? [];
      items.push(option);
      groups.set(key, items);
    });
    groups.forEach((items, group) => {
      const section = document.createElement('section');
      section.className = 'ymz-project-choice-panel__group';
      if (group) {
        const heading = document.createElement('h4');
        heading.textContent = group;
        section.appendChild(heading);
      }
      const list = document.createElement('div');
      list.className = 'ymz-project-choice-panel__list';
      items.forEach((option) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `ymz-project-choice-panel__item${option.value === this.selected ? ' is-selected' : ''}`;
        button.dataset.projectChoiceValue = option.value;
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', String(option.value === this.selected));
        button.disabled = this.config.readonly();
        const visual = document.createElement('span');
        visual.className = 'ymz-project-choice-panel__visual';
        if (option.iconHtml) visual.innerHTML = option.iconHtml;
        else {
          visual.classList.add('ymz-project-choice-panel__swatch');
          visual.style.setProperty('--ymz-choice-color', option.previewColor || 'var(--b3-theme-primary)');
        }
        const copy = document.createElement('span');
        copy.className = 'ymz-project-choice-panel__copy';
        const label = document.createElement('strong');
        label.textContent = option.label;
        copy.appendChild(label);
        if (option.description) {
          const description = document.createElement('small');
          description.textContent = option.description;
          copy.appendChild(description);
        }
        const check = document.createElement('span');
        check.className = 'ymz-project-choice-panel__check';
        check.textContent = option.value === this.selected ? '✓' : '';
        button.append(visual, copy, check);
        list.appendChild(button);
      });
      section.appendChild(list);
      this.body.appendChild(section);
    });
  }
}
