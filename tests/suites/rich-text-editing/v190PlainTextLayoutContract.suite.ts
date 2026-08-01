import { describe, expect, it, vi } from 'vitest';
import {
  applyPlainTextLayoutAttributes,
  createPlainTextLayoutResult,
} from '../../../vendor/simple-mind-map-runtime/src/core/render/node/plainTextLayout';

describe('v1.9.0 plain text layout contract', () => {
  it('keeps ink, wrapping and content-box widths as separate metrics', () => {
    const node = { kind: 'svg-group' };
    const result = createPlainTextLayoutResult({
      node,
      inkWidth: 218.25,
      wrapWidth: 240,
      contentWidth: 219,
      height: 44,
      hardLines: ['PCIe RAS 与 LTSSM 状态分析'],
      visualLines: ['PCIe RAS 与 LTSSM', '状态分析'],
      autoWrapped: true,
    });

    expect(result).toEqual({
      node,
      inkWidth: 218.25,
      wrapWidth: 240,
      contentWidth: 219,
      width: 219,
      height: 44,
      hardLines: ['PCIe RAS 与 LTSSM 状态分析'],
      visualLines: ['PCIe RAS 与 LTSSM', '状态分析'],
      autoWrapped: true,
    });
  });

  it('writes explicit SVG metrics while retaining legacy data-width', () => {
    const attr = vi.fn();
    const group = { attr };
    const result = createPlainTextLayoutResult({
      node: group,
      inkWidth: 83.4,
      wrapWidth: 240,
      contentWidth: 84,
      height: 22,
      hardLines: ['AXI/PCIe'],
      visualLines: ['AXI/PCIe'],
      autoWrapped: false,
    });

    applyPlainTextLayoutAttributes(group, result);

    expect(attr).toHaveBeenCalledWith({
      'data-width': 84,
      'data-height': 22,
      'data-ink-width': 83.4,
      'data-wrap-width': 240,
      'data-content-width': 84,
      'data-auto-wrapped': false,
    });
  });

  it('rejects a content box wider than its wrapping boundary', () => {
    expect(() => createPlainTextLayoutResult({
      node: {},
      inkWidth: 250,
      wrapWidth: 240,
      contentWidth: 250,
      height: 22,
      hardLines: ['invalid'],
      visualLines: ['invalid'],
      autoWrapped: false,
    })).toThrow(/contentWidth/);
  });
});
