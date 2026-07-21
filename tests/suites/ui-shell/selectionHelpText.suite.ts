import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const settingsSource = readFileSync(resolve(process.cwd(), 'src/settings/settingsDialogTemplate.ts'), 'utf8');
const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');

describe('multi-selection guidance', () => {
  it('documents the two canvas modes and native batch movement', () => {
    for (const text of [
      '拖（拖动优先）：左键拖动画布，Ctrl/Cmd + 左键框选',
      '选（选择优先）：左键框选，右键拖动画布',
      'Ctrl/Cmd + 单击：增减节点选择',
      '拖动任一已选节点：批量移动最上层所选子树',
    ]) {
      expect(`${settingsSource}\n${editorSource}`).toContain(text);
    }
  });
});
