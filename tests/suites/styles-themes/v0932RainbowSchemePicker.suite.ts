import { describe, expect, it, vi } from 'vitest';
import { RainbowSchemePicker } from '../../../src/ui/rainbowSchemePicker';

function pickerHost(): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = `
    <button type="button" data-rainbow-trigger>
      <span data-rainbow-current-label></span>
      <i data-project-rainbow-preview></i>
    </button>
    <select data-project-style="rainbowScheme" hidden></select>
    <div data-rainbow-picker hidden></div>
  `;
  document.body.appendChild(host);
  return host;
}

describe('v0.9.32 grouped rainbow scheme picker', () => {
  it('renders grouped two-column palette cards and selects a scheme', () => {
    const host = pickerHost();
    const onSelect = vi.fn();
    const picker = new RainbowSchemePicker(host, {
      selected: 'rainbow',
      readonly: () => false,
      onSelect,
    });
    const panel = host.querySelector<HTMLElement>('[data-rainbow-picker]')!;
    expect(panel.querySelectorAll('[data-rainbow-group]')).toHaveLength(2);
    expect(panel.querySelector('[data-rainbow-value="dawn"]')).not.toBeNull();
    host.querySelector<HTMLButtonElement>('[data-rainbow-trigger]')!.click();
    panel.querySelector<HTMLButtonElement>('[data-rainbow-value="dawn"]')!.click();
    expect(onSelect).toHaveBeenCalledWith('dawn');
    expect(panel.hidden).toBe(true);
    picker.destroy();
    host.remove();
  });

  it('does not open or select while readonly', () => {
    const host = pickerHost();
    const onSelect = vi.fn();
    const picker = new RainbowSchemePicker(host, {
      selected: 'rainbow',
      readonly: () => true,
      onSelect,
    });
    const trigger = host.querySelector<HTMLButtonElement>('[data-rainbow-trigger]')!;
    const panel = host.querySelector<HTMLElement>('[data-rainbow-picker]')!;
    trigger.click();
    panel.querySelector<HTMLButtonElement>('[data-rainbow-value="dawn"]')!.click();
    expect(panel.hidden).toBe(true);
    expect(onSelect).not.toHaveBeenCalled();
    picker.destroy();
    host.remove();
  });

  it('synchronizes the visible label, gradient and active option', () => {
    const host = pickerHost();
    const picker = new RainbowSchemePicker(host, {
      selected: 'rainbow',
      readonly: () => false,
      onSelect: () => undefined,
    });
    picker.setSelected('dawn');
    expect(host.querySelector('[data-rainbow-current-label]')?.textContent).toBe('晨曦');
    expect(host.querySelector('[data-rainbow-value="dawn"]')?.classList.contains('is-selected')).toBe(true);
    expect(host.querySelector<HTMLElement>('[data-project-rainbow-preview]')?.style.background).toContain('linear-gradient');
    picker.destroy();
    host.remove();
  });
});
