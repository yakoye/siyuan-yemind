import { describe, expect, it } from 'vitest';
import {
  NODE_STYLE_KEYS,
  normalizeNodeStylePatch,
  nodeStyleSnapshot,
  resetNodeStylePatch,
} from '../../../src/editor/nodeStyle';

describe('node style contract', () => {
  it('normalizes supported native node style fields and rejects unrelated data', () => {
    expect(normalizeNodeStylePatch({
      shape: 'pill',
      fillColor: '#ff0000',
      borderColor: '#112233',
      borderWidth: '2',
      borderDasharray: '5,5',
      width: '121',
      fontFamily: 'NeverMind',
      fontSize: '18',
      fontWeight: '700',
      fontStyle: 'italic',
      textDecoration: 'underline',
      textAlign: 'center',
      color: '#000000',
      ignored: 'value',
    })).toEqual({
      shape: 'pill',
      fillColor: '#ff0000',
      borderColor: '#112233',
      borderWidth: 2,
      borderDasharray: '5,5',
      width: 121,
      fontFamily: 'NeverMind',
      fontSize: 18,
      fontWeight: '700',
      fontStyle: 'italic',
      textDecoration: 'underline',
      textAlign: 'center',
      color: '#000000',
    });
  });

  it('reads only native style fields from node data', () => {
    const snapshot = nodeStyleSnapshot({ fillColor: '#fff', uid: 'u1', text: 'A', fontSize: 16 });
    expect(snapshot).toEqual({ fillColor: '#fff', fontSize: 16 });
  });

  it('creates an explicit reset patch for every supported style field', () => {
    const patch = resetNodeStylePatch();
    expect(Object.keys(patch).sort()).toEqual([...NODE_STYLE_KEYS].sort());
    expect(Object.values(patch).every((value) => value === null)).toBe(true);
  });
});
