import { describe, expect, it } from 'vitest';
import { synchronizeCanvasRichTextVisibility } from '../../../src/editor/canvasRichTextVisibility';

describe('v0.6.5 canvas rich-text visibility regression', () => {
  it('uses the actual node text color and a safe edit background', () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'smm-richtext-node-edit-wrap';
    wrapper.innerHTML = '<div class="ql-container"><div class="ql-editor">Visible text</div></div>';
    const node = { style: { merge: (key: string) => key === 'color' ? '#1e293b' : '#ffffff' } };
    const map = {
      richText: { textEditNode: wrapper, node },
      renderer: { textEdit: { getBackground: () => '#ffffff' } },
    };
    expect(synchronizeCanvasRichTextVisibility(map as any)).toBe(true);
    expect(wrapper.style.getPropertyValue('color')).toBe('rgb(30, 41, 59)');
    expect(wrapper.style.getPropertyPriority('color')).toBe('important');
    expect(wrapper.style.background).toBe('rgb(255, 255, 255)');
    expect(['0', '0px']).toContain(wrapper.style.border);
    expect(['0', '0px']).toContain(wrapper.style.outline);
    expect(wrapper.style.boxShadow).toBe('none');
    const editor = wrapper.querySelector<HTMLElement>('.ql-editor')!;
    expect(editor.style.color).toBe('inherit');
    expect(['0', '0px']).toContain(editor.style.border);
    expect(['0', '0px']).toContain(editor.style.outline);
    expect(editor.style.boxShadow).toBe('none');
  });

  it('hides only the active node static text while its Quill editor is visible', () => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'block';
    wrapper.innerHTML = '<div class="ql-container"><div class="ql-editor">唯一编辑层</div></div>';
    const staticText = document.createElement('div');
    staticText.className = 'smm-richtext-node-wrap';
    staticText.textContent = '不应叠在编辑器下面';
    const foreignObject = document.createElement('foreignObject');
    foreignObject.append(staticText);
    const node = {
      getData: (key: string) => key === 'uid' ? 'active-uid' : undefined,
      style: { merge: () => '#1f2937' },
      _textData: { nodeContent: { node: foreignObject } },
    };
    const map = {
      richText: { textEditNode: wrapper, node, showTextEdit: true },
      renderer: { textEdit: { getBackground: () => '#ffffff' } },
    };

    expect(synchronizeCanvasRichTextVisibility(map as any)).toBe(true);
    expect(staticText.hidden).toBe(true);
    expect(staticText.getAttribute('aria-hidden')).toBe('true');

    map.richText.showTextEdit = false;
    expect(synchronizeCanvasRichTextVisibility(map as any)).toBe(true);
    expect(staticText.hidden).toBe(false);
    expect(staticText.hasAttribute('aria-hidden')).toBe(false);
  });
});

import { createMindMap } from '../../../src/core/createMindMap';
import { createCommandAdapter } from '../../../src/core/commands';
import { RichTextToolbar } from '../../../src/editor/RichTextToolbar';

function rect(left = 0, top = 0, width = 100, height = 30) {
  return { x: left, y: top, left, top, right: left + width, bottom: top + height, width, height, toJSON() {} } as any;
}

it('keeps real double-click editing visible and shows formatting tools for a partial selection', async () => {
  const wrapper = document.createElement('div');
  wrapper.className = 'ymz-editor';
  const canvas = document.createElement('div');
  wrapper.appendChild(canvas);
  document.body.appendChild(wrapper);
  Object.defineProperty(canvas, 'clientWidth', { value: 800 });
  Object.defineProperty(canvas, 'clientHeight', { value: 600 });
  canvas.getBoundingClientRect = () => rect(0, 0, 800, 600);
  const proto: any = (globalThis as any).SVGElement?.prototype;
  if (proto) {
    proto.getBBox ??= () => ({ x: 0, y: 0, width: 100, height: 30 });
    proto.getBoundingClientRect = () => rect(10, 10, 100, 30);
    proto.getScreenCTM ??= () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse() { return this; } });
  }
  const rangeProto: any = Range.prototype;
  rangeProto.getBoundingClientRect ??= () => rect(20, 20, 40, 20);
  rangeProto.getClientRects ??= () => [];

  const map: any = createMindMap({
    el: canvas,
    data: { data: { text: 'Visible text', uid: 'root', color: '#1e293b', fillColor: '#ffffff' }, children: [] } as any,
    settings: undefined,
  });
  map.on('before_show_text_edit', () => queueMicrotask(() => synchronizeCanvasRichTextVisibility(map)));
  await new Promise((resolve) => setTimeout(resolve, 50));
  const commands = createCommandAdapter(map);
  const toolbar = new RichTextToolbar(wrapper, commands);
  map.on('rich_text_selection_change', (hasRange: boolean, bounds: any, format: any) => toolbar.update(hasRange, bounds, format, commands));

  try {
    for (let attempt = 0; attempt < 50 && !map.renderer.root?.group?.node; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    expect(map.renderer.root?.group?.node).toBeTruthy();
    map.renderer.root.group.node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientX: 20, clientY: 20 }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const editWrap = wrapper.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap')!;
    expect(editWrap.style.getPropertyValue('color')).toBe('rgb(30, 41, 59)');
    expect(editWrap.style.background).toBe('rgb(255, 255, 255)');

    map.richText.quill.setSelection(0, 7, 'user');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(wrapper.querySelector<HTMLElement>('.ymz-rich-toolbar')?.hidden).toBe(false);
    wrapper.querySelector<HTMLButtonElement>('[data-rich-action="bold"]')!.click();
    expect(map.richText.quill.getFormat(0, 7).bold).toBe(true);
    expect(map.richText.quill.getFormat(8, 4).bold).not.toBe(true);
  } finally {
    toolbar.destroy();
    map.destroy();
    wrapper.remove();
  }
});
