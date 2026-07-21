import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const createSource = readFileSync(resolve(process.cwd(), 'src/core/createMindMap.ts'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

describe('editor-local rich-text overlays', () => {
  it('mounts upstream editors in the YeMind editor and allows partial node-text selection', () => {
    expect(createSource).toContain('customInnerElsAppendTo: editorRoot');
    expect(createSource).toContain('selectTextOnEnterEditText: false');
  });

  it('contains toolbar z-index inside the tab and preserves visible edit text', () => {
    expect(css).toContain('.ymz-editor{isolation:isolate;z-index:0}');
    expect(css).toContain('.ymz-rich-toolbar{position:absolute;z-index:60}');
    expect(css).toContain('.smm-richtext-node-edit-wrap .ql-editor{color:inherit!important');
  });
});
