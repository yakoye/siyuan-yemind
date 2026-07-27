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
  label?: string;
  iconHTML?: string;
  accelerator?: string;
  disabled?: boolean;
  warning?: boolean;
  click?: () => void;
  submenu?: MenuItem[];
  subMenu?: MenuItem[];
}

export class Menu {
  readonly element: HTMLElement;

  constructor(id = 'yemind-web-menu', private readonly closeCallback?: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'b3-menu ymw-menu';
    this.element.dataset.menuId = id;
    this.element.hidden = true;
    document.body.appendChild(this.element);
  }

  addItem(option: MenuItem): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `b3-menu__item${option.warning ? ' is-warning' : ''}`;
    button.disabled = Boolean(option.disabled);
    if (option.iconHTML) {
      const icon = document.createElement('span');
      icon.className = 'b3-menu__icon';
      icon.innerHTML = option.iconHTML;
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
    button.addEventListener('click', () => {
      if (button.disabled) return;
      option.click?.();
      this.close();
    });
    this.element.appendChild(button);
    return button;
  }

  addSeparator(): HTMLElement {
    const separator = document.createElement('div');
    separator.className = 'b3-menu__separator';
    separator.setAttribute('role', 'separator');
    this.element.appendChild(separator);
    return separator;
  }

  open({ x, y }: { x: number; y: number }): void {
    this.element.hidden = false;
    this.element.style.left = `${Math.max(8, x)}px`;
    this.element.style.top = `${Math.max(8, y)}px`;
    document.addEventListener('mousedown', this.onDocumentMouseDown, true);
  }

  close(): void {
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
