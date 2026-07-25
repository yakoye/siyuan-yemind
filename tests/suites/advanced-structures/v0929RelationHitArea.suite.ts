import { describe, expect, it } from 'vitest';
import {
  RELATION_HIT_WIDTH,
  resolveRelationHitWidth,
} from '../../../src/core/relationHitArea';

describe('v0.9.29 relation hit area', () => {
  it('uses a wide invisible hit target without thickening the active visual stroke', () => {
    expect(RELATION_HIT_WIDTH).toBeGreaterThanOrEqual(10);
    expect(resolveRelationHitWidth(3)).toBe(RELATION_HIT_WIDTH);
    expect(resolveRelationHitWidth(16)).toBe(16);
  });
});
