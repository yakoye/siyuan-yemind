import { describe, expect, it } from 'vitest';
import { createDefaultTree } from '../../../src/model/defaultMap';
describe('v0.9.24 default map', () => {
  it('creates only the center topic', () => {
    expect(createDefaultTree().children).toEqual([]);
  });
});
