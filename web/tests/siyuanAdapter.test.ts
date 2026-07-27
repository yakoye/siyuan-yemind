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
});
