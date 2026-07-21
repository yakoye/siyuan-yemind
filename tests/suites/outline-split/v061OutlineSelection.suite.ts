import { describe, expect, it } from 'vitest';
import {
  isOutlineTextSelectionTarget,
  shouldStartOutlinePointerDrag,
} from '../../../src/editor/outlineDrag';

describe('v0.6.1 outline text selection versus row drag', () => {
  it('never starts structure dragging from an active Quill editing surface', () => {
    expect(shouldStartOutlinePointerDrag({
      interactive: false,
      fromEditor: true,
      editing: true,
      elapsedMs: 800,
      distancePx: 40,
    })).toBe(false);
  });

  it('classifies the active editor and Quill descendants as text-selection targets', () => {
    const activeHost = document.createElement('div');
    activeHost.dataset.outlineEditor = '';
    activeHost.classList.add('is-editing');
    const qlEditor = document.createElement('div');
    qlEditor.className = 'ql-editor';
    qlEditor.contentEditable = 'true';
    const text = document.createElement('span');
    qlEditor.appendChild(text);
    activeHost.appendChild(qlEditor);

    expect(isOutlineTextSelectionTarget(text, activeHost)).toBe(true);
    expect(isOutlineTextSelectionTarget(qlEditor, activeHost)).toBe(true);
    expect(isOutlineTextSelectionTarget(activeHost, activeHost)).toBe(true);
  });

  it('still permits deliberate long-press dragging from a non-editing row label', () => {
    expect(shouldStartOutlinePointerDrag({
      interactive: false,
      fromEditor: true,
      editing: false,
      elapsedMs: 280,
      distancePx: 7,
    })).toBe(true);
  });
});
