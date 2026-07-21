import { describe, expect, it, vi } from 'vitest';
import { createCommandAdapter } from '../../../src/core/commands';
import { createRelationPresentation } from '../../../src/editor/relationPresentation';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';

function fakeMap() {
  const textGroup = { id: 'relation-text' };
  const associativeLine = {
    isCreatingLine: false,
    activeLine: null as any,
    createLineFromActiveNode: vi.fn(function (this: any) { this.isCreatingLine = true; }),
    cancelCreateLine: vi.fn(function (this: any) { this.isCreatingLine = false; }),
    showEditTextBox: vi.fn(),
    removeLine: vi.fn(),
  };
  return {
    renderer: { activeNodeList: [{}] },
    associativeLine,
    textGroup,
  };
}

describe('native associative-line presentation', () => {
  it('wraps only native create, cancel, edit, and delete methods', () => {
    const map = fakeMap();
    const commands = createCommandAdapter(map as never);

    expect(commands.startRelation()).toBe(true);
    expect(map.associativeLine.createLineFromActiveNode).toHaveBeenCalledOnce();
    expect(commands.isRelationCreating()).toBe(true);

    commands.cancelRelation();
    expect(map.associativeLine.cancelCreateLine).toHaveBeenCalledOnce();
    expect(commands.isRelationCreating()).toBe(false);

    map.associativeLine.activeLine = [{}, {}, map.textGroup, {}, {}];
    expect(commands.hasActiveRelation()).toBe(true);
    commands.editActiveRelationText();
    commands.removeActiveRelation();
    expect(map.associativeLine.showEditTextBox).toHaveBeenCalledWith(map.textGroup);
    expect(map.associativeLine.removeLine).toHaveBeenCalledOnce();
  });

  it('renders the compact relation toolbar in the editor shell', () => {
    const html = createEditorTemplate('Map');
    expect(html).toContain('data-role="relation-panel"');
    expect(html).toContain('data-relation-action="edit"');
    expect(html).toContain('data-relation-action="delete"');
    expect(html).toContain('data-relation-action="cancel"');
  });

  it('produces one compact state for creation and one for an active line', () => {
    expect(createRelationPresentation({ isCreating: false, isActive: false })).toEqual({
      mode: 'idle',
      hidden: true,
      hint: '',
    });
    expect(createRelationPresentation({ isCreating: true, isActive: false })).toEqual({
      mode: 'creating',
      hidden: false,
      hint: '点击目标节点完成关联，Esc 取消',
    });
    expect(createRelationPresentation({ isCreating: false, isActive: true })).toEqual({
      mode: 'active',
      hidden: false,
      hint: '关联线已选中，可拖动端点和控制点',
    });
  });
});
