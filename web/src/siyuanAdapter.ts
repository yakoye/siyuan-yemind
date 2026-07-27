interface DialogOptions {
  title?: string;
  content: string;
  width?: string;
  height?: string;
  destroyCallback?: () => void;
  disableClose?: boolean;
  hideCloseIcon?: boolean;
}

export class Dialog {
  readonly element: HTMLElement;
  private destroyed = false;

  constructor(private readonly options: DialogOptions) {
    const shell = document.createElement('div');
    shell.className = 'b3-dialog ymw-dialog';
    shell.setAttribute('role', 'presentation');
    shell.innerHTML = `
      <div class="b3-dialog__scrim"></div>
      <section class="b3-dialog__container" role="dialog" aria-modal="true">
        <header class="b3-dialog__header">
          <strong>${options.title ?? ''}</strong>
          ${options.hideCloseIcon ? '' : '<button type="button" class="b3-dialog__close" aria-label="关闭">×</button>'}
        </header>
        <div class="b3-dialog__content">${options.content}</div>
      </section>
    `;
    const container = shell.querySelector<HTMLElement>('.b3-dialog__container')!;
    if (options.width) container.style.width = options.width;
    if (options.height) container.style.height = options.height;
    shell.querySelector('.b3-dialog__close')?.addEventListener('click', () => this.destroy());
    shell.querySelector('.b3-dialog__scrim')?.addEventListener('click', () => {
      if (!options.disableClose) this.destroy();
    });
    document.addEventListener('keydown', this.onKeyDown);
    document.body.appendChild(shell);
    this.element = shell;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    document.removeEventListener('keydown', this.onKeyDown);
    this.element.remove();
    this.options.destroyCallback?.();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && !this.options.disableClose) this.destroy();
  };
}

interface MenuItem {
  type?: string;
  label?: string;
  icon?: string;
  iconHTML?: string;
  accelerator?: string;
  disabled?: boolean;
  warning?: boolean;
  current?: boolean;
  click?: () => void;
  submenu?: MenuItem[];
  subMenu?: MenuItem[];
}

const MENU_MARGIN = 8;

function clampMenuAxis(point: number, size: number, viewport: number): number {
  return Math.max(MENU_MARGIN, Math.min(point, Math.max(MENU_MARGIN, viewport - size - MENU_MARGIN)));
}

function builtInMenuIcon(name: string): string {
  const common = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const paths: Record<string, string> = {
    iconAdd: '<path d="M12 5v14M5 12h14"/>',
    iconCheck: '<path d="m5 12 4 4L19 6"/>',
    iconCopy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    iconTrashcan: '<path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5"/>',
    iconEdit: '<path d="m4 20 4.2-1 10.6-10.6-3.2-3.2L5 15.8 4 20Zm9.8-13 3.2 3.2"/>',
    iconImage: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m5 18 5-5 3 3 2-2 4 4"/>',
    iconLink: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"/>',
    iconMath: '<path d="M18 4H6l6 8-6 8h12"/>',
    iconUp: '<path d="m6 14 6-6 6 6"/>',
    iconDown: '<path d="m6 10 6 6 6-6"/>',
    iconRefresh: '<path d="M20 7v5h-5M4 17v-5h5M6.2 8.5A7 7 0 0 1 18.6 7M5.4 17A7 7 0 0 0 17.8 15.5"/>',
    iconFocus: '<circle cx="12" cy="12" r="4"/><path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true" ${common}>${paths[name] ?? '<circle cx="12" cy="12" r="4"/>'}</svg>`;
}

export class Menu {
  readonly element: HTMLElement;
  private readonly list: HTMLElement;
  private readonly submenus = new Set<HTMLElement>();
  private closed = false;

  constructor(id = 'yemind-web-menu', private readonly closeCallback?: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'b3-menu ymw-menu';
    this.element.dataset.menuId = id;
    this.element.hidden = true;
    this.element.setAttribute('role', 'menu');
    this.list = document.createElement('div');
    this.list.className = 'ymw-menu__list';
    this.element.appendChild(this.list);
    document.body.appendChild(this.element);
  }

  addItem(option: MenuItem): HTMLElement {
    return this.appendItem(this.list, option);
  }

  private appendItem(container: HTMLElement, option: MenuItem): HTMLElement {
    const entry = document.createElement('div');
    entry.className = 'ymw-menu__entry';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `b3-menu__item${option.warning ? ' is-warning' : ''}${option.current ? ' is-current' : ''}`;
    button.setAttribute('role', 'menuitem');
    button.disabled = Boolean(option.disabled);
    if (option.iconHTML || option.icon) {
      const icon = document.createElement('span');
      icon.className = 'b3-menu__icon';
      icon.innerHTML = option.iconHTML || builtInMenuIcon(option.icon ?? '');
      button.appendChild(icon);
    }
    const label = document.createElement('span');
    label.className = 'b3-menu__label';
    label.textContent = option.label ?? '';
    button.appendChild(label);
    if (option.accelerator) {
      const accelerator = document.createElement('kbd');
      accelerator.textContent = option.accelerator;
      button.appendChild(accelerator);
    }
    const children = option.submenu ?? option.subMenu ?? [];
    if (children.length > 0) {
      button.classList.add('has-submenu');
      button.setAttribute('aria-haspopup', 'menu');
      button.setAttribute('aria-expanded', 'false');
      const arrow = document.createElement('span');
      arrow.className = 'ymw-menu__arrow';
      arrow.textContent = '›';
      button.appendChild(arrow);
      const submenu = document.createElement('div');
      submenu.className = 'ymw-submenu';
      submenu.setAttribute('role', 'menu');
      submenu.hidden = true;
      children.forEach((child) => this.appendItem(submenu, child));
      this.element.appendChild(submenu);
      this.submenus.add(submenu);
      let hideTimer = 0;
      const hide = (): void => {
        window.clearTimeout(hideTimer);
        hideTimer = window.setTimeout(() => {
          submenu.hidden = true;
          button.setAttribute('aria-expanded', 'false');
        }, 120);
      };
      const show = (): void => {
        window.clearTimeout(hideTimer);
        this.submenus.forEach((candidate) => {
          if (candidate !== submenu && !candidate.contains(button)) candidate.hidden = true;
        });
        submenu.hidden = false;
        button.setAttribute('aria-expanded', 'true');
        const anchor = button.getBoundingClientRect();
        const rect = submenu.getBoundingClientRect();
        const width = rect.width || 220;
        const height = rect.height || submenu.scrollHeight;
        const right = anchor.right + 4;
        const left = anchor.left - width - 4;
        submenu.style.left = `${Math.round(right + width <= window.innerWidth - MENU_MARGIN ? right : Math.max(MENU_MARGIN, left))}px`;
        submenu.style.top = `${Math.round(clampMenuAxis(anchor.top, height, window.innerHeight))}px`;
        submenu.style.maxHeight = `${Math.max(80, window.innerHeight - MENU_MARGIN * 2)}px`;
      };
      entry.addEventListener('mouseenter', show);
      entry.addEventListener('mouseleave', hide);
      submenu.addEventListener('mouseenter', () => window.clearTimeout(hideTimer));
      submenu.addEventListener('mouseleave', hide);
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        if (submenu.hidden) show();
        else hide();
      });
    } else {
      button.addEventListener('click', () => {
        if (button.disabled) return;
        option.click?.();
        this.close();
      });
    }
    entry.appendChild(button);
    container.appendChild(entry);
    return button;
  }

  addSeparator(): HTMLElement {
    const separator = document.createElement('div');
    separator.className = 'b3-menu__separator';
    separator.setAttribute('role', 'separator');
    this.list.appendChild(separator);
    return separator;
  }

  open({ x, y }: { x: number; y: number }): void {
    this.element.hidden = false;
    this.element.style.maxHeight = `${Math.max(80, window.innerHeight - MENU_MARGIN * 2)}px`;
    const rect = this.element.getBoundingClientRect();
    this.element.style.left = `${Math.round(clampMenuAxis(x, rect.width, window.innerWidth))}px`;
    this.element.style.top = `${Math.round(clampMenuAxis(y, rect.height, window.innerHeight))}px`;
    document.addEventListener('mousedown', this.onDocumentMouseDown, true);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    document.removeEventListener('mousedown', this.onDocumentMouseDown, true);
    this.element.remove();
    this.closeCallback?.();
  }

  destroy(): void {
    this.close();
  }

  private readonly onDocumentMouseDown = (event: MouseEvent): void => {
    const target = event.target as Node | null;
    if (target && this.element.contains(target)) return;
    this.close();
  };
}

export function confirm(
  title: string,
  content: string,
  onConfirm?: () => void,
  onCancel?: () => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (accepted: boolean): void => {
      if (settled) return;
      settled = true;
      if (accepted) onConfirm?.();
      else onCancel?.();
      dialog.destroy();
      resolve(accepted);
    };
    const dialog = new Dialog({
      title,
      content: `
        <div class="ymw-confirm__message">${content}</div>
        <footer class="ymw-confirm__actions">
          <button type="button" data-dialog-action="cancel">取消</button>
          <button type="button" class="is-primary" data-dialog-action="confirm">确定</button>
        </footer>
      `,
      width: '420px',
      destroyCallback: () => {
        if (!settled) {
          settled = true;
          onCancel?.();
          resolve(false);
        }
      },
    });
    dialog.element.querySelector('[data-dialog-action="cancel"]')
      ?.addEventListener('click', () => finish(false));
    dialog.element.querySelector('[data-dialog-action="confirm"]')
      ?.addEventListener('click', () => finish(true));
  });
}

export function showMessage(
  message: string,
  timeout = 3000,
  type: 'info' | 'error' | string = 'info',
): void {
  let host = document.querySelector<HTMLElement>('.ymw-messages');
  if (!host) {
    host = document.createElement('div');
    host.className = 'ymw-messages';
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  const item = document.createElement('div');
  item.className = `ymw-message is-${type}`;
  item.textContent = message;
  host.appendChild(item);
  window.setTimeout(() => {
    item.remove();
    if (!host?.children.length) host?.remove();
  }, timeout);
}
