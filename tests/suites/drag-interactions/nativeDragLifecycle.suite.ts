import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
const createSource = readFileSync(resolve(process.cwd(), 'src/core/createMindMap.ts'), 'utf8');
const settingsTemplateSource = readFileSync(resolve(process.cwd(), 'src/settings/settingsDialogTemplate.ts'), 'utf8');

describe('native drag lifecycle', () => {
  it('delegates drag position and subtree layout entirely to simple-mind-map', () => {
    expect(createSource).toContain('enableFreeDrag: false');
    expect(editorSource).not.toContain("this.map.on('node_dragging'");
    expect(editorSource).not.toContain("this.map.on('node_dragend'");
    expect(editorSource).not.toContain('DragViewportController');
  });

  it('does not expose unstable free-drag or viewport restoration controls', () => {
    expect(settingsTemplateSource).not.toContain('data-setting="dragMode"');
    expect(settingsTemplateSource).not.toContain('data-setting="preserveViewportAfterDrag"');
  });
});
