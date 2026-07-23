import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { createCommandAdapter } from '../../../src/core/commands';
import { hasActiveNodeWidthDrag, LiveNodeWidthLayoutController } from '../../../src/editor/liveNodeWidthLayout';
import { shouldPassivelySyncOutline } from '../../../src/editor/editingSurfaceCoordinator';
import { markerCatalog, markerSvg } from '../../../src/core/localAssetCatalogs';
import { nodeInsertIcon, nodeStyleIcon } from '../../../src/editor/projectControls';

const menuSource = readFileSync(resolve(process.cwd(), 'src/ui/contextMenu.ts'), 'utf8');
const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
const outlineSource = readFileSync(resolve(process.cwd(), 'src/editor/StructuredOutlineEditorController.ts'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

const singleNodeMenuSource = menuSource.slice(menuSource.indexOf('const hasOuterFrame ='), menuSource.indexOf('menu.open({ x: event.clientX, y: event.clientY });', menuSource.indexOf('const hasOuterFrame =')));

function position(label: string): number {
  return singleNodeMenuSource.indexOf(`label: '${label}'`);
}

describe('v0.9.17 user-reported interaction regressions', () => {
  it('reflows the complete tree during node-width dragging', () => {
    const child = { isDragHandleMousedown: true, children: [] };
    const root = { children: [{ children: [child] }] };
    expect(hasActiveNodeWidthDrag(root)).toBe(true);

    const listeners = new Map<string, EventListener>();
    let pending: FrameRequestCallback | null = null;
    const map = { renderer: { root }, render: vi.fn() };
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
    expect(map.render).not.toHaveBeenCalled();
    pending?.(0);
    expect(map.render).toHaveBeenCalledOnce();
    controller.destroy();
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

  it('organizes single-node context commands in the requested order and labels', () => {
    const labels = [
      '编辑节点', '插入同级节点', '插入子节点', '插入父节点',
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

  it('provides three matching node insertion icons and aligns menu SVG with its label', () => {
    expect(nodeInsertIcon('sibling')).toContain('ymz-icon-insert-sibling');
    expect(nodeInsertIcon('child')).toContain('ymz-icon-insert-child');
    expect(nodeInsertIcon('parent')).toContain('ymz-icon-insert-parent');
    expect(nodeStyleIcon()).toContain('class="ymz-menu-icon ymz-icon-node-style"');
    expect(css).toMatch(/\.ymz-context-menu \.b3-menu__icon\{[^}]*align-items:center/s);
    expect(css).toMatch(/\.ymz-context-menu \.b3-menu__icon \.ymz-menu-icon\{[^}]*width:18px[^}]*height:18px/s);
  });
});
