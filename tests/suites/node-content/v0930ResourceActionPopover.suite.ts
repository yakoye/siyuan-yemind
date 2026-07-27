import { describe, expect, it } from 'vitest';
import { ResourceActionPopover } from '../../../src/editor/resourceActionPopover';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');

describe('v0.9.30 marker and clipart resource actions', () => {
  it('shows replace/delete before opening an asset picker', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    let replaced = 0;
    let deleted = 0;
    const popover = new ResourceActionPopover(root);
    popover.show({
      kind: 'marker',
      anchorRect: new DOMRect(20, 20, 18, 18),
      onReplace: () => { replaced += 1; },
      onDelete: () => { deleted += 1; },
    });
    const host = root.querySelector<HTMLElement>('.ymz-resource-action-popover')!;
    expect(host.textContent).toContain('替换');
    expect(host.textContent).toContain('删除');
    host.querySelector<HTMLButtonElement>('[data-resource-action="replace"]')!.click();
    expect(replaced).toBe(1);
    popover.show({ kind: 'clipart', anchorRect: new DOMRect(20, 20, 18, 18), onReplace: () => {}, onDelete: () => { deleted += 1; } });
    root.querySelector<HTMLButtonElement>('[data-resource-action="delete"]')!.click();
    expect(deleted).toBe(1);
    popover.destroy();
    root.remove();
  });

  it('routes canvas and outline marker/clipart clicks through the shared popover', () => {
    expect(editorSource).toContain('resourceActionPopover.show');
    expect(editorSource).not.toMatch(/onIconEdit:[\s\S]{0,500}openMarkerPicker\(this\.commands/);
    expect(editorSource).not.toMatch(/yemind_node_clipart_edit[\s\S]{0,600}openClipartPicker\(this\.commands/);
  });
});
