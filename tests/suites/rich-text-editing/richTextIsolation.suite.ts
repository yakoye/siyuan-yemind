import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const createSource = readFileSync(resolve(process.cwd(), 'src/core/createMindMap.ts'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

describe('canvas rich-text overlays', () => {
  it('keeps the upstream fixed editor in the body portal and allows partial node-text selection', () => {
    expect(createSource).toContain('customInnerElsAppendTo: null');
    expect(createSource).not.toContain('customInnerElsAppendTo: editorRoot');
    expect(createSource).toContain('selectTextOnEnterEditText: false');
  });

  it('keeps the toolbar above the upstream body portal and preserves visible edit text', () => {
    expect(css).toContain('.ymz-editor{isolation:isolate;z-index:0}');
    expect(css).toContain('.ymz-rich-toolbar{position:absolute;z-index:60}');
    expect(css).toContain('body > .ymz-rich-toolbar{');
    expect(css).toContain('z-index:3101');
    expect(css).toContain('.smm-richtext-node-edit-wrap .ql-editor{color:inherit!important');
    expect(css).toContain('body > .smm-richtext-node-edit-wrap .ql-editor::selection');
  });
});
