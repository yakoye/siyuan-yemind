import { describe, expect, it } from 'vitest';
import { normalizeHexColor, presentColor } from '../../../src/editor/colorPresentation';

describe('color presentation', () => {
  it('normalizes short and long hexadecimal colors', () => {
    expect(normalizeHexColor('#abc')).toBe('#AABBCC');
    expect(normalizeHexColor('#1a2b3c')).toBe('#1A2B3C');
  });

  it('presents matching HEX and RGB values', () => {
    expect(presentColor('#ff4d3d')).toEqual({ hex: '#FF4D3D', rgb: 'RGB(255, 77, 61)' });
  });

  it('falls back to inherited color for unsupported values', () => {
    expect(presentColor('currentColor')).toEqual({ hex: '默认', rgb: '继承节点颜色' });
  });
});
