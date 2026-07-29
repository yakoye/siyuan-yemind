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
  groups?: readonly string[];
  presentation?: 'list' | 'palette';
  selected: string;
  favoriteValues?: readonly string[];
  emptyGroupMessage?(group: string): string;
  onFavoriteChange?(value: string, favorite: boolean): void | Promise<void>;
  applyLabel?(option: ProjectChoiceOption): string;
  readonly(): boolean;
  onPreview?(value: string): void;
  onSelect(value: string): void;
}

export class ProjectChoicePanel {
  private readonly panel: HTMLElement;
  private readonly body: HTMLElement;
  private selected: string;
  private committedSelected: string;
  private options: readonly ProjectChoiceOption[];
  private favoriteValues: readonly string[];
  private activeGroup = '';
  private anchor: HTMLElement | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly config: ProjectChoicePanelOptions,
  ) {
    this.panel = root.querySelector<HTMLElement>(`[data-role="${config.role}"]`)!;
    this.body = this.panel.querySelector<HTMLElement>('[data-project-choice-body]')!;
    this.selected = config.selected;
    this.committedSelected = config.selected;
    this.options = config.options;
    this.favoriteValues = config.favoriteValues ?? [];
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
    this.committedSelected = value;
    this.activeGroup = this.groupForValue(value) ?? this.activeGroup;
    this.render();
  }

  setOptions(options: readonly ProjectChoiceOption[], favoriteValues: readonly string[] = this.favoriteValues): void {
    this.options = options;
    this.favoriteValues = favoriteValues;
    this.render();
  }

  refreshReadonly(): void { this.render(); }

  toggle(anchor: HTMLElement): void {
    if (this.isVisible()) this.hide();
    else this.show(anchor);
  }

  show(anchor: HTMLElement): void {
    this.anchor = anchor;
    this.selected = this.committedSelected;
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
    if (this.selected !== this.committedSelected) {
      this.selected = this.committedSelected;
      this.config.onPreview?.(this.committedSelected);
      this.render();
    }
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
    const favorite = target.closest<HTMLButtonElement>('[data-project-choice-favorite]');
    if (favorite) {
      const value = favorite.dataset.projectChoiceFavorite ?? '';
      if (!value || !this.config.onFavoriteChange) return;
      const next = !this.favoriteValues.includes(value);
      void this.config.onFavoriteChange(value, next);
      return;
    }
    const apply = target.closest<HTMLButtonElement>('[data-project-choice-apply]');
    if (apply) {
      if (apply.disabled || this.config.readonly()) return;
      this.config.onSelect(this.selected);
      this.hide();
      return;
    }
    const button = target.closest<HTMLButtonElement>('[data-project-choice-value]');
    if (!button || button.disabled || this.config.readonly()) return;
    const value = button.dataset.projectChoiceValue ?? '';
    if (!value) return;
    this.selected = value;
    this.config.onPreview?.(value);
    this.render();
    if (!this.config.applyLabel) {
      this.config.onSelect(value);
      this.hide();
    }
  };

  private groups(): string[] {
    return this.config.groups
      ? [...this.config.groups]
      : [...new Set(this.options.map((option) => option.group ?? '').filter(Boolean))];
  }

  private groupForValue(value: string): string | undefined {
    const candidates = this.options.filter((option) => option.value === value);
    return candidates.find((option) => option.group !== '常用')?.group
      ?? candidates[0]?.group
      ?? undefined;
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
    const options = this.options.filter((option) => (option.group ?? '') === this.activeGroup);
    if (options.length === 0) {
      const message = this.config.emptyGroupMessage?.(this.activeGroup);
      if (message) {
        const empty = document.createElement('div');
        empty.className = 'ymz-project-choice-panel__empty';
        empty.dataset.projectChoiceEmpty = 'true';
        empty.textContent = message;
        grid.appendChild(empty);
      }
    }
    options.forEach((option) => {
      const selected = option.value === this.selected;
      const card = document.createElement('div');
      card.className = 'ymz-project-choice-panel__palette-card';
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
      colors.forEach((color) => {
        const block = document.createElement('i');
        block.className = 'ymz-project-choice-panel__palette-block';
        block.style.backgroundColor = color;
        strip.appendChild(block);
      });
      strip.style.setProperty('--ymz-palette-count', String(Math.max(1, colors.length)));
      button.append(label, strip);
      if (this.config.onFavoriteChange) {
        const favorite = document.createElement('button');
        favorite.type = 'button';
        favorite.className = 'ymz-project-choice-panel__favorite';
        favorite.dataset.projectChoiceFavorite = option.value;
        const active = this.favoriteValues.includes(option.value);
        favorite.setAttribute('aria-pressed', String(active));
        favorite.setAttribute('aria-label', `${active ? '取消收藏' : '收藏'}${option.label}`);
        favorite.title = active ? '取消收藏' : '收藏到常用';
        favorite.textContent = active ? '★' : '☆';
        card.append(button, favorite);
      } else {
        card.appendChild(button);
      }
      grid.appendChild(card);
    });

    this.body.append(tabs, grid);
    const selectedOption = this.options.find((option) => option.value === this.selected);
    if (this.config.applyLabel && selectedOption) {
      const footer = document.createElement('footer');
      footer.className = 'ymz-project-choice-panel__footer';
      const apply = document.createElement('button');
      apply.type = 'button';
      apply.dataset.projectChoiceApply = 'true';
      apply.textContent = this.config.applyLabel(selectedOption);
      apply.disabled = this.config.readonly();
      footer.appendChild(apply);
      this.body.appendChild(footer);
    }
  }

  private renderList(): void {
    const groups = new Map<string, ProjectChoiceOption[]>();
    this.options.forEach((option) => {
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
