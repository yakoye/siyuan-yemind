import { describe, expect, it } from 'vitest';
import {
  RICH_TEXT_ACTIONS,
  isClozeFormat,
  nextToggleFormat,
} from '../../../src/editor/richTextActions';

describe('rich text actions', () => {
  it('provides the core text actions and special YeMind actions', () => {
    expect(RICH_TEXT_ACTIONS.map((item) => item.id)).toEqual(expect.arrayContaining([
      'bold', 'italic', 'underline', 'strike', 'cloze', 'formula', 'clear',
    ]));
  });

  it('toggles boolean Quill formats from the current selection state', () => {
    expect(nextToggleFormat('bold', {})).toEqual({ bold: true });
    expect(nextToggleFormat('bold', { bold: true })).toEqual({ bold: false });
  });

  it('detects the reversible cloze style', () => {
    expect(isClozeFormat({ color: 'transparent', background: '#f5dfa0' })).toBe(true);
    expect(isClozeFormat({ color: '#000000' })).toBe(false);
  });
});
