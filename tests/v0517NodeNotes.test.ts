import { describe, expect, it, vi } from 'vitest';
import { normalizeNodeNote, updateNodeNote } from '../src/content/nodeNoteState';
import { createCommandAdapter } from '../src/core/commands';
import { createNodePostfixContent } from '../src/core/nodeDecorations';
import { buildHoverPreviewHtml } from '../src/ui/nodeHoverPreview';

function fakeNode(data: Record<string, unknown>) {
  const emit = vi.fn();
  return {
    getData: (key?: string) => key ? data[key] : data,
    mindMap: { emit },
  } as any;
}

describe('node notes and hover previews', () => {
  it('normalizes legacy note strings and updates timestamps', () => {
    expect(normalizeNodeNote('Long note', 100)).toEqual({ html: 'Long note', createdAt: 100, updatedAt: 100 });
    const updated = updateNodeNote({ html: 'Old', createdAt: 10, updatedAt: 20 }, '<p>New</p>', 30, { width: 420, height: 300 });
    expect(updated).toEqual({ html: '<p>New</p>', createdAt: 10, updatedAt: 30, width: 420, height: 300 });
    expect(updateNodeNote(null, '   ', 30)).toBeNull();
    const sanitized = updateNodeNote(null, '<img src="javascript:alert(1)" onerror="boom()"><p>Safe</p><script>bad()</script>', 40);
    expect(sanitized?.html).toContain('<p>Safe</p>');
    expect(sanitized?.html).not.toContain('javascript:');
    expect(sanitized?.html).not.toContain('onerror');
    expect(sanitized?.html).not.toContain('<script');
  });

  it('writes note data through SET_NODE_DATA', () => {
    const node: any = { isRoot: false, isGeneralization: false, getData: vi.fn(() => ({})) };
    const map: any = {
      opt: { readonly: false }, renderer: { activeNodeList: [node] }, execCommand: vi.fn(), render: vi.fn(),
      view: { fit: vi.fn(), reset: vi.fn(), enlarge: vi.fn(), narrow: vi.fn() },
    };
    const commands = createCommandAdapter(map);
    commands.setNote({ html: '<p>Note</p>', createdAt: 1, updatedAt: 2 });
    expect(map.execCommand).toHaveBeenCalledWith('SET_NODE_DATA', node, { yemindNote: { html: '<p>Note</p>', createdAt: 1, updatedAt: 2 } });
  });

  it('renders separate note and comment icons without counts and emits hover events', () => {
    const node = fakeNode({
      yemindNote: { html: '<p>Long note</p>', createdAt: 1, updatedAt: 1 },
      yemindComments: [{ id: 'c1', text: 'Comment', createdAt: 1, updatedAt: 1 }],
    });
    const content = createNodePostfixContent(node)!;
    expect(content.el.querySelector('[data-yemind-badge="note"]')).not.toBeNull();
    expect(content.el.querySelector('[data-yemind-badge="comments"]')).not.toBeNull();
    expect(content.el.textContent?.trim()).toBe('');
    const note = content.el.querySelector<HTMLElement>('[data-yemind-badge="note"]')!;
    note.dispatchEvent(new Event('pointerenter', { bubbles: true }));
    expect(node.mindMap.emit).toHaveBeenCalledWith('yemind_badge_hover', 'note', node, note, true);
  });

  it('sanitizes note preview and lists comment text', () => {
    expect(buildHoverPreviewHtml('note', { html: '<script>x</script><p>Hello</p>', createdAt: 1, updatedAt: 1 })).not.toContain('<script');
    const html = buildHoverPreviewHtml('comments', [{ id: '1', text: '<hello>', createdAt: 1, updatedAt: 1 }]);
    expect(html).toContain('&lt;hello&gt;');
    expect(html).not.toContain('1 条');
  });
});
