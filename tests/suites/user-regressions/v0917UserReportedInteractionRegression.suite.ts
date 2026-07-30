import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { createCommandAdapter } from '../../../src/core/commands';
import { hasActiveNodeWidthDrag, LiveNodeWidthLayoutController } from '../../../src/editor/liveNodeWidthLayout';
import { shouldPassivelySyncOutline } from '../../../src/editor/editingSurfaceCoordinator';
import { markerCatalog, markerSvg } from '../../../src/core/localAssetCatalogs';
import { nodeInsertIcon, nodeStyleIcon } from '../../../src/editor/projectControls';
import { preserveLiveTextData } from '../../../vendor/simple-mind-map-runtime/src/core/render/node/nodeModifyWidth';

const menuSource = readFileSync(resolve(process.cwd(), 'src/ui/contextMenu.ts'), 'utf8');
const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
const outlineSource = readFileSync(resolve(process.cwd(), 'src/editor/StructuredOutlineEditorController.ts'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

const singleNodeMenuSource = menuSource.slice(menuSource.indexOf('const hasOuterFrame ='), menuSource.indexOf('menu.open({ x: event.clientX, y: event.clientY });', menuSource.indexOf('const hasOuterFrame =')));

function position(label: string): number {
  return singleNodeMenuSource.indexOf(`label: '${label}'`);
}

describe('v0.9.17 user-reported interaction regressions', () => {
  it('preserves the painted text container while a width drag reflows its contents', () => {
    const oldOuterDom = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const oldForeignDom = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    oldForeignDom.setAttribute('width', '180');
    oldForeignDom.innerHTML = '<div class="smm-richtext-node-wrap" style="width: 180px; max-width: 180px">稳定文本</div>';
    const oldContentDom = oldForeignDom.firstElementChild;
    oldOuterDom.appendChild(oldForeignDom);
    const nextOuterDom = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const nextForeignDom = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    nextForeignDom.setAttribute('width', '260');
    nextForeignDom.setAttribute('height', '64');
    nextForeignDom.innerHTML = '<div class="smm-richtext-node-wrap" style="width: 260px; max-width: 260px">稳定文本</div>';
    nextOuterDom.appendChild(nextForeignDom);

    const oldOuter = { node: oldOuterDom, attr: vi.fn() };
    const oldForeign = { node: oldForeignDom };
    const nextOuter = { node: nextOuterDom, attr: vi.fn(() => ({ 'data-width': 260, 'data-height': 64 })) };
    const nextForeign = { node: nextForeignDom };
    const oldData = {
      node: oldOuter,
      nodeContent: oldForeign,
      width: 180,
      height: 28,
    };
    const nextData = {
      node: nextOuter,
      nodeContent: nextForeign,
      width: 260,
      height: 64,
    };

    const preserved = preserveLiveTextData(oldData, nextData);

    expect(preserved).toBe(oldData);
    expect(preserved.node).toBe(oldOuter);
    expect(preserved.nodeContent).toBe(oldForeign);
    expect(oldForeignDom.getAttribute('width')).toBe('260');
    expect(oldForeignDom.getAttribute('height')).toBe('64');
    expect(oldForeignDom.firstElementChild).toBe(oldContentDom);
    expect((oldContentDom as HTMLElement).style.width).toBe('260px');
    expect((oldContentDom as HTMLElement).style.maxWidth).toBe('260px');
    expect(oldForeignDom.textContent).toBe('稳定文本');
    expect(preserved.width).toBe(260);
    expect(preserved.height).toBe(64);
  });

  it('keeps node-width dragging local until the upstream mouseup commit', () => {
    const child = { isDragHandleMousedown: true, children: [] };
    const root = { children: [{ children: [child] }] };
    expect(hasActiveNodeWidthDrag(root)).toBe(true);

    const listeners = new Map<string, EventListener>();
    let pending: FrameRequestCallback | null = null;
    const updateTextEditNode = vi.fn();
    const render = vi.fn((callback?: () => void) => callback?.());
    const map = {
      renderer: { root },
      richText: { showTextEdit: true, updateTextEditNode },
      render,
    };
    const controller = new LiveNodeWidthLayoutController(
      map,
      {
        addEventListener: (name: string, listener: EventListener) => listeners.set(name, listener),
        removeEventListener: (name: string) => listeners.delete(name),
      } as any,
      {
        request: (callback) => { pending = callback; return 1; },
        cancel: vi.fn(),
      },
    );
    listeners.get('mousemove')?.(new Event('mousemove'));
    expect(render).not.toHaveBeenCalled();
    pending?.(0);
    expect(render).not.toHaveBeenCalled();
    expect(updateTextEditNode).toHaveBeenCalledOnce();
    controller.destroy();
  });

  it('does not reposition a hidden rich-text editor during width dragging', () => {
    const root = { isDragHandleMousedown: true, children: [] };
    const listeners = new Map<string, EventListener>();
    let pending: FrameRequestCallback | null = null;
    const updateTextEditNode = vi.fn();
    const map = {
      renderer: { root },
      richText: { showTextEdit: false, updateTextEditNode },
      render: vi.fn((callback?: () => void) => callback?.()),
    };
    const controller = new LiveNodeWidthLayoutController(
      map,
      {
        addEventListener: (name: string, listener: EventListener) => listeners.set(name, listener),
        removeEventListener: (name: string) => listeners.delete(name),
      } as any,
      {
        request: (callback) => { pending = callback; return 1; },
        cancel: vi.fn(),
      },
    );
    listeners.get('mousemove')?.(new Event('mousemove'));
    pending?.(0);
    expect(updateTextEditNode).not.toHaveBeenCalled();
    controller.destroy();
  });

  it('does not overwrite the upstream width draft or restore stale data during repeated moves', () => {
    const child = {
      isDragHandleMousedown: true,
      customTextWidth: 260,
      nodeData: { data: { uid: 'resized-node', customTextWidth: 180 } },
      children: [],
    };
    const listeners = new Map<string, EventListener>();
    let pending: FrameRequestCallback | null = null;
    const target = {
      addEventListener: (name: string, listener: EventListener) => listeners.set(name, listener),
      removeEventListener: (name: string) => listeners.delete(name),
    } as any;
    const map = {
      renderer: { root: { children: [child] } },
      render: vi.fn(),
    };
    const controller = new LiveNodeWidthLayoutController(map, target, {
      request: vi.fn((callback) => { pending = callback; return 1; }),
      cancel: vi.fn(),
    });

    listeners.get('mousemove')?.(new Event('mousemove'));
    pending?.(0);
    expect(child.nodeData.data.customTextWidth).toBe(180);
    expect(map.render).not.toHaveBeenCalled();

    child.customTextWidth = 320;
    listeners.get('mousemove')?.(new Event('mousemove'));
    pending?.(16);
    expect(child.nodeData.data.customTextWidth).toBe(180);
    expect(map.render).not.toHaveBeenCalled();

    child.nodeData.data.customTextWidth = child.customTextWidth;
    listeners.get('mouseup')?.(new Event('mouseup'));
    expect(child.nodeData.data.customTextWidth).toBe(320);
    controller.destroy();
  });

  it('uses a larger pointer hit box while keeping quick-action circles compact', () => {
    expect(css).toMatch(
      /\.ymz-node-quick-action\s*\{[^}]*width:28px;[^}]*height:26px;[^}]*border:0/s,
    );
    expect(css).toMatch(
      /\.ymz-node-quick-action__visual\{[^}]*min-width:15px;[^}]*height:15px/s,
    );
    expect(css).toContain('.ymz-node-quick-actions{gap:0!important}');
    expect(css).toContain('.ymz-node-quick-action + .ymz-node-quick-action{margin-left:-12px!important}');
    expect(css).toContain('.ymz-node-quick-actions[data-quick-side="right"] .ymz-node-quick-action{justify-items:start}');
    expect(css).toContain('.ymz-node-quick-actions[data-quick-side="left"]{flex-direction:row-reverse}');
    expect(css).toContain('.ymz-node-quick-actions[data-quick-side="left"] .ymz-node-quick-action{justify-items:end}');
    expect(css).toContain('.ymz-node-quick-actions[data-quick-side="right"] { transform: translate(-1px, -50%); }');
    expect(css).toContain('.ymz-node-quick-actions[data-quick-side="left"] { transform: translate(calc(-100% + 1px), -50%); }');
  });

  it('anchors outline disclosure markers to the first text line', () => {
    const finalOutlineRowRule = css.lastIndexOf('.ymz-outline-row{');
    expect(finalOutlineRowRule).toBeGreaterThanOrEqual(0);
    expect(css.slice(finalOutlineRowRule, css.indexOf('}', finalOutlineRowRule) + 1))
      .toContain('align-items:flex-start');
  });

  it('opens the primary node text editor and lets the configured editor select all text', () => {
    const node = { uid: 'node-a' };
    const show = vi.fn();
    const map: any = {
      opt: { readonly: false },
      renderer: { activeNodeList: [node], textEdit: { show } },
      view: { fit() {}, reset() {}, enlarge() {}, narrow() {} },
      execCommand() {},
    };
    createCommandAdapter(map).edit();
    expect(show).toHaveBeenCalledWith({ node, isInserting: false, isFromKeyDown: false });
  });

  it('keeps canvas node selection from being overwritten by a stale outline DOM range', () => {
    expect(shouldPassivelySyncOutline('canvas')).toBe(true);
    expect(shouldPassivelySyncOutline('none')).toBe(true);
    expect(shouldPassivelySyncOutline('outline')).toBe(false);
    expect(editorSource).toContain('this.outlineRichText?.syncActiveUid(uid, reveal)');
    expect(outlineSource).toContain('selection.removeAllRanges()');
    expect(outlineSource).toContain('this.activateUid(uid, scroll, false)');
  });

  it('clips marker sprite overflow so one icon cannot intercept clicks over unrelated nodes', () => {
    const svg = markerSvg('/plugins/siyuan-yemind/assets/icons/marker-sprite.png', markerCatalog.items[0]);
    const document = new JSDOM(svg, { contentType: 'image/svg+xml' }).window.document;
    const root = document.documentElement;
    expect(root.getAttribute('overflow')).toBe('hidden');
    expect(root.getAttribute('style')).toContain('overflow:hidden');
    expect(document.querySelector('image')?.getAttribute('pointer-events')).toBe('none');
  });

  it.skip('organizes single-node context commands in the requested order and labels', () => {
    const labels = [
      '编辑节点', '插入上级节点', '插入同级节点', '插入下级节点',
      '添加', '关联线', '节点样式', '复制', '剪切', '粘贴',
      '粘贴（纯文本）', '上移节点', '下移节点', '展开/折叠（下级节点）',
    ];
    labels.forEach((label) => expect(position(label)).toBeGreaterThanOrEqual(0));
    for (let index = 1; index < labels.length; index += 1) {
      expect(position(labels[index])).toBeGreaterThan(position(labels[index - 1]));
    }
    expect(singleNodeMenuSource).not.toContain("label: '+ 插入同级节点'");
    expect(singleNodeMenuSource).not.toContain("label: '+ 添加子节点'");
    expect(singleNodeMenuSource).not.toContain("label: '+ 添加父节点'");
    expect(singleNodeMenuSource).toContain("label: todoAction.label");
    expect(singleNodeMenuSource).toContain("label: hasOuterFrame ? '删除外框' : '外框'");
  });

  it.skip('provides three matching node insertion icons and aligns menu SVG with its label', () => {
    expect(nodeInsertIcon('sibling')).toContain('ymz-icon-insert-sibling');
    expect(nodeInsertIcon('child')).toContain('ymz-icon-insert-child');
    expect(nodeInsertIcon('parent')).toContain('ymz-icon-insert-parent');
    expect(nodeStyleIcon()).toContain('class="ymz-menu-icon ymz-operation-icon ymz-icon-node-style"');
    expect(css).toMatch(/\.ymz-context-menu \.b3-menu__icon\{[^}]*align-items:center/s);
    expect(css).toMatch(/\.ymz-context-menu \.b3-menu__icon \.ymz-menu-icon\{[^}]*width:18px[^}]*height:18px/s);
  });
});
