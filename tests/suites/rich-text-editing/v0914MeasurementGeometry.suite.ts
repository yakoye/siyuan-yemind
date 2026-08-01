import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  editorHorizontalMargin,
  resolveRenderedTextRect,
} from '../../../src/editor/richTextGeometry';

describe('v0.9.14 stable node measurement geometry', () => {
  it('uses the real text child instead of a padded prefix group as the editor anchor', () => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.classList.add('smm-text-node-wrap');
    group.append(text);
    document.body.append(group);
    vi.spyOn(group, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(1026, 429.5, 83, 26),
    );
    vi.spyOn(text, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(1028, 433.5, 71, 18),
    );
    const node = {
      _prefixData: { width: 18 },
      _textData: {
        node: {
          node: group,
          attr: (name: string) => name === 'data-width' ? 71 : 18,
        },
      },
      getStyle: () => 'left',
    };

    const resolved = resolveRenderedTextRect(node);

    expect(resolved?.rect.left).toBe(1028);
    expect(resolved?.rect.top).toBe(433.5);
    expect(resolved?.rect.width).toBe(71);
    expect(resolved?.rect.height).toBe(18);
  });

  it('never lets text-editor padding overlap a todo or icon prefix', () => {
    expect(editorHorizontalMargin({ _prefixData: { width: 18 } }, 6, 5, 1)).toBe(-5);
    expect(editorHorizontalMargin({ _iconData: [{ width: 18 }] }, 6, 5, 1)).toBe(-5);
    expect(editorHorizontalMargin({}, 6, 5, 1)).toBe(-6);
  });

  it('reserves a symmetric glyph safety gutter so bold root text is never clipped', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
    expect(css).toMatch(/\.ymz-editor \.smm-richtext-node-wrap\{[^}]*box-sizing:border-box;[^}]*padding-inline:1px;/s);
  });

  it('measures rich HTML from its intrinsic content width unless the user set a width', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
    expect(css).toMatch(
      /\.ymz-editor \.smm-richtext-node-wrap\{[^}]*display:inline-block;[^}]*width:max-content;/s,
    );
  });
});
