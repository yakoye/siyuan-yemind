import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const templateSource = readFileSync(resolve(process.cwd(), 'src/editor/editorTemplate.ts'), 'utf8');
const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
const createSource = readFileSync(resolve(process.cwd(), 'src/core/createMindMap.ts'), 'utf8');

describe('native multi-selection integration', () => {
  it('exposes a thin mode toggle and selected-count presentation', () => {
    expect(templateSource).toContain('data-action="toggle-selection-mode"');
    expect(templateSource).toContain('data-role="selection-count"');
    expect(editorSource).toContain('createSelectionPresentation');
    expect(editorSource).toContain('settingsStore.update({ canvasMode: nextMode })');
    expect(editorSource).toMatch(/this\.map\.on\(["']node_active["']/);
  });

  it('keeps selection and multi-node drag owned by simple-mind-map', () => {
    expect(createSource).toContain('enableCtrlKeyNodeSelection: true');
    expect(createSource).toContain("useLeftKeySelectionRightKeyDrag: settings?.canvasMode === 'select'");
    expect(editorSource).not.toContain('createSelectionRect');
    expect(editorSource).not.toContain('beingDragNodeList =');
    expect(editorSource).not.toMatch(/this\.map\.on\(["']node_dragging["']/);
  });
});
