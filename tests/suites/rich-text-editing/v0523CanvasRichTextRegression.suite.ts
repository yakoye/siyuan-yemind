import { describe, expect, it, vi } from 'vitest';
import { createMindMap } from '../../../src/core/createMindMap';
import { createCommandAdapter } from '../../../src/core/commands';
import { RichTextToolbar } from '../../../src/editor/RichTextToolbar';

function rect(left=0,top=0,width=100,height=30) { return { x:left,y:top,left,top,right:left+width,bottom:top+height,width,height,toJSON(){} } as any; }

describe('v0.5.23 canvas rich-text integration', () => {
  it('enters from a real SVG dblclick, selects part of the label, shows toolbar and formats only selection', async () => {
    const wrapper = document.createElement('div'); wrapper.className='ymz-editor';
    const el = document.createElement('div'); wrapper.appendChild(el); document.body.appendChild(wrapper);
    Object.defineProperty(el, 'clientWidth', { value: 800 });
    Object.defineProperty(el, 'clientHeight', { value: 600 });
    el.getBoundingClientRect = () => rect(0,0,800,600);
    const proto:any = (globalThis as any).SVGElement?.prototype;
    if (proto) {
      proto.getBBox ??= () => ({ x:0,y:0,width:100,height:30 });
      proto.getBoundingClientRect = () => rect(10,10,100,30);
      proto.getScreenCTM ??= () => ({ a:1,b:0,c:0,d:1,e:0,f:0,inverse(){return this;} });
    }
    const rangeProto:any = Range.prototype;
    rangeProto.getBoundingClientRect ??= () => rect(20,20,40,20);
    rangeProto.getClientRects ??= () => [];
    const map:any = createMindMap({ el, data: { data:{ text:'Root text', uid:'root' }, children:[] } as any, settings: undefined });
    await new Promise(r => setTimeout(r, 50));
    const commands = createCommandAdapter(map);
    const toolbar = new RichTextToolbar(wrapper, commands);
    map.on('rich_text_selection_change', (hasRange:any, bounds:any, format:any) => toolbar.update(hasRange,bounds,format,commands));
    const node = map.renderer.root;
    node.group.node.dispatchEvent(new MouseEvent('dblclick', { bubbles:true, clientX:20, clientY:20 }));
    await new Promise(r => setTimeout(r, 20));
    expect(map.richText.showTextEdit).toBe(true);
    expect(map.richText.quill.getSelection()).toMatchObject({ index: 0, length: 9 });
    expect(wrapper.querySelector<HTMLElement>('.ymz-rich-toolbar')?.hidden).toBe(false);
    map.richText.quill.setSelection(0, 4, 'user');
    await new Promise(r => setTimeout(r, 0));
    expect(wrapper.querySelector<HTMLElement>('.ymz-rich-toolbar')?.hidden).toBe(false);
    wrapper.querySelector<HTMLButtonElement>('[data-rich-action="bold"]')!.click();
    expect(map.richText.quill.getFormat(0,4).bold).toBe(true);
    expect(map.richText.quill.getFormat(5,4).bold).not.toBe(true);

    map.richText.quill.setSelection(0, 4, 'user');
    wrapper.querySelector<HTMLButtonElement>('[data-rich-action="underline"]')!.click();
    expect(map.richText.quill.getFormat(0,4).underline).toBe(true);
    expect(map.richText.quill.getFormat(5,4).underline).not.toBe(true);
    toolbar.destroy(); map.destroy(); wrapper.remove();
  });
});

import { CanvasRightDragController } from '../../../src/editor/canvasRightDrag';

describe('v0.5.23 stale canvas gesture cleanup', () => {
  it('ends a right drag on window mouseup so the text editor never inherits a stuck no-selection state', () => {
    const listeners = new Map<string, (...args: any[]) => void>();
    const root = document.createElement('div');
    const map = {
      on: vi.fn((name: string, callback: (...args: any[]) => void) => listeners.set(name, callback)),
      off: vi.fn(),
      view: { translateXY: vi.fn() },
    };
    const controller = new CanvasRightDragController({ root, map, mode: () => 'pan' });

    listeners.get('mousedown')?.({ button: 2, clientX: 0, clientY: 0 });
    listeners.get('mousemove')?.({ clientX: 12, clientY: 0, preventDefault: vi.fn() });
    expect(root.classList.contains('is-canvas-right-dragging')).toBe(true);

    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 2 }));
    expect(root.classList.contains('is-canvas-right-dragging')).toBe(false);
    controller.destroy();
  });
});
