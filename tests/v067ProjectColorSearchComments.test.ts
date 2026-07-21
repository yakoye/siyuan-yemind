import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createEditorTemplate } from '../src/editor/editorTemplate';
import { ProjectStylePanel } from '../src/ui/projectStylePanel';
import { mountGlobalSearchResults, resolveGlobalSearchMount } from '../src/plugin/globalSearch';
import { buildCommentsListHtml } from '../src/ui/commentsPresentation';

const maps = [{
  id: 'map-1', title: '未命名导图2', createdAt: 1, updatedAt: 1,
  layout: 'logicalStructure', theme: 'kmind-default', lineStyle: 'curve' as const,
  data: { data: { uid: 'root', text: '未命名导图0' }, children: [
    { data: { uid: 'n-target', text: '目标关键词' }, children: [] },
  ] },
}];

describe('v0.6.7 shared project colors, native search placement and comments alignment', () => {
  it('uses the same 52-color editable palette for the whole-map custom background', () => {
    const root = document.createElement('div');
    root.innerHTML = createEditorTemplate('Demo');
    const changes: unknown[] = [];
    const panel = new ProjectStylePanel(
      root,
      { density: 'default', rainbowLines: null, backgroundColor: null },
      () => false,
      (style) => changes.push(style),
    );

    const trigger = root.querySelector<HTMLButtonElement>('[data-project-color-trigger="backgroundColor"]')!;
    trigger.click();
    const popover = root.querySelector<HTMLElement>('.ymz-project-color-popover')!;
    expect(popover.hidden).toBe(false);
    expect(popover.querySelectorAll('[data-color-value]')).toHaveLength(52);
    expect(popover.textContent).toContain('重置默认');
    expect(popover.textContent).toContain('更多颜色');
    expect(popover.querySelector('[data-color-input="hex"]')).not.toBeNull();
    expect(popover.querySelector('[data-color-input="rgb"]')).not.toBeNull();

    const hex = popover.querySelector<HTMLInputElement>('[data-color-input="hex"]')!;
    hex.value = '#123456';
    hex.dispatchEvent(new Event('input', { bubbles: true }));
    expect(popover.querySelector<HTMLInputElement>('[data-color-input="rgb"]')!.value).toBe('18, 52, 86');
    expect(changes.at(-1)).toMatchObject({ backgroundColor: '#123456' });

    const bodyKey = new KeyboardEvent('keydown', { key: 'x', bubbles: true });
    const bodyListener = vi.fn();
    root.addEventListener('keydown', bodyListener);
    hex.dispatchEvent(bodyKey);
    expect(bodyListener).not.toHaveBeenCalled();
    panel.destroy();
  });

  it('mounts YeMind results at the top of the native search result region and activates on pointer down', () => {
    const root = document.createElement('div');
    root.innerHTML = `<div class="search__layout"><div class="search__header"><input value="目标关键词"></div><div class="search__list"><div class="native-empty">搜索结果为空</div></div></div>`;
    document.body.appendChild(root);
    const input = root.querySelector<HTMLInputElement>('input')!;
    expect(resolveGlobalSearchMount(input)?.mountPoint).toBe(root.querySelector('.search__list'));
    const onOpen = vi.fn();
    mountGlobalSearchResults({ searchElement: input, maps, onOpen });
    const native = root.querySelector('.search__list')!;
    expect(native.firstElementChild?.hasAttribute('data-yemind-global-results')).toBe(true);
    const result = root.querySelector<HTMLElement>('[data-yemind-global-node="n-target"]')!;
    result.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
    expect(onOpen).not.toHaveBeenCalled();
    expect(result.classList.contains('b3-list-item--focus')).toBe(true);
    root.remove();
  });

  it('right-aligns comment metadata actions and footer actions', () => {
    const html = buildCommentsListHtml([{ id: 'c1', text: '批注正文', createdAt: 1, updatedAt: 1 }]);
    expect(html).toContain('ymz-comment__meta');
    expect(html).toContain('ymz-comment__actions');
    const css = readFileSync('src/styles/index.css', 'utf8');
    expect(css).toContain('.ymz-comments-dialog .ymz-comment__time{flex:0 1 auto;margin-left:auto;text-align:right}');
    expect(css).toContain('.ymz-comments-dialog__footer{justify-content:flex-end}');
  });
});
