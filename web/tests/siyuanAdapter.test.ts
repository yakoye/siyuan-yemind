import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog, Menu, confirm, showMessage } from '../src/siyuanAdapter';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('standalone SiYuan adapter', () => {
  it('renders and destroys a compatible dialog', () => {
    const destroyed = vi.fn();
    const dialog = new Dialog({
      title: '标题',
      content: '<p>内容</p>',
      width: '420px',
      destroyCallback: destroyed,
    });
    expect(document.querySelector('.b3-dialog__container')).not.toBeNull();
    expect(dialog.element.textContent).toContain('内容');
    dialog.destroy();
    expect(document.querySelector('.b3-dialog')).toBeNull();
    expect(destroyed).toHaveBeenCalledOnce();
  });

  it('resolves confirm and runs the callback', async () => {
    const accepted = vi.fn();
    const result = confirm('标题', '内容', accepted);
    document.querySelector<HTMLButtonElement>('[data-dialog-action="confirm"]')!.click();
    await expect(result).resolves.toBe(true);
    expect(accepted).toHaveBeenCalledOnce();
  });

  it('renders menu actions and live messages', () => {
    const click = vi.fn();
    const menu = new Menu('test');
    menu.addItem({ label: '执行', click });
    menu.open({ x: 20, y: 30 });
    menu.element.querySelector<HTMLButtonElement>('button')!.click();
    expect(click).toHaveBeenCalledOnce();
    showMessage('已保存');
    expect(document.querySelector('[aria-live="polite"]')?.textContent).toContain('已保存');
  });

  it('keeps a tall menu inside every viewport edge', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 640 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 480 });
    const menu = new Menu('viewport');
    vi.spyOn(menu.element, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 310,
      bottom: 420,
      width: 310,
      height: 420,
      toJSON: () => ({}),
    });

    menu.open({ x: 620, y: 470 });

    expect(menu.element.style.left).toBe('322px');
    expect(menu.element.style.top).toBe('52px');
    expect(menu.element.style.maxHeight).toBe('464px');
  });

  it('renders the nested SiYuan menu hierarchy instead of dropping submenus', () => {
    const menu = new Menu('nested');
    const parent = menu.addItem({
      label: '结构',
      submenu: [
        { label: '右向导图', current: true },
        { label: '组织架构图' },
      ],
    } as any);

    expect(parent.classList.contains('has-submenu')).toBe(true);
    expect(parent.getAttribute('aria-haspopup')).toBe('menu');
    expect(menu.element.querySelectorAll('.ymw-submenu .b3-menu__item')).toHaveLength(2);
    expect(menu.element.querySelector('.ymw-submenu .is-current')?.textContent).toContain('右向导图');
  });

  it('supports arrow, Home, End, submenu and Escape keyboard navigation', () => {
    const origin = document.createElement('button');
    origin.textContent = '打开菜单';
    document.body.appendChild(origin);
    origin.focus();
    const menu = new Menu('keyboard');
    menu.addItem({ label: '禁用', disabled: true });
    menu.addItem({ label: '第一项' });
    menu.addItem({ label: '结构', submenu: [{ label: '右向导图' }] } as any);
    menu.addItem({ label: '最后一项' });
    menu.open({ x: 12, y: 12 });

    expect(document.activeElement?.textContent).toContain('第一项');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement?.textContent).toContain('最后一项');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(document.activeElement?.textContent).toContain('第一项');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement?.textContent).toContain('结构');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement?.textContent).toContain('右向导图');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(document.activeElement?.textContent).toContain('结构');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('[data-menu-id="keyboard"]')).toBeNull();
    expect(document.activeElement).toBe(origin);
  });
});
