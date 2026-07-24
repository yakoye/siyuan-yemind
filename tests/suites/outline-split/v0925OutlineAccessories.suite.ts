import { describe, expect, it } from 'vitest';
import { outlineAccessoriesFromData, outlineAccessoriesHtml } from '../../../src/editor/outlineAccessories';
import { flattenStructuredOutline } from '../../../src/editor/structuredOutlineDocument';

const data = {
  uid: 'n1',
  text: '节点',
  icon: ['yemind_star', 'priority_1'],
  image: 'data:image/png;base64,AAAA',
  imageTitle: '示例图片',
  yemindClipartId: 'plant-1',
};

describe('v0.9.25 outline accessories', () => {
  it('extracts image, clipart and icon content without visual node styles', () => {
    const accessories = outlineAccessoriesFromData(data);
    expect(accessories.icons).toEqual(['yemind_star', 'priority_1']);
    expect(accessories.image?.url).toBe(data.image);
    expect(accessories.image?.clipartId).toBe('plant-1');
    expect(outlineAccessoriesHtml(accessories)).toContain('ymz-outline-accessories');
    expect(outlineAccessoriesHtml(accessories)).toContain('contenteditable="false"');
  });

  it('carries accessories in flattened outline blocks while ignoring fill and border styling', () => {
    const [block] = flattenStructuredOutline({
      data: { ...data, fillColor: '#f00', borderColor: '#0f0' },
      children: [],
    });
    expect(block.accessories.icons).toEqual(data.icon);
    expect(block).not.toHaveProperty('fillColor');
    expect(block).not.toHaveProperty('borderColor');
  });
});
