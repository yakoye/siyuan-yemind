import { describe, expect, it } from 'vitest';
import { createDefaultMap } from '../../../src/model/defaultMap';

describe('v0.9.13 new-map naming', () => {
  it('keeps the file title unnamed while using neutral node labels', () => {
    const map = createDefaultMap(undefined, 'map-id', 1);
    expect(map.title).toBe('未命名导图');
    expect(map.data.data.text).toBe('中心主题');
    expect(map.data.children.map((child) => child.data.text)).toEqual(['新节点', '新节点']);
  });
});
