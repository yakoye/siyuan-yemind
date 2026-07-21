import { describe, expect, it } from 'vitest';
import { YEMIND_RICH_TEXT_FORMATS } from '../src/editor/YeMindRichText';

describe('YeMindRichText', () => {
  it('enables the upstream rich formats plus inline links and code formats', () => {
    expect(YEMIND_RICH_TEXT_FORMATS).toEqual(expect.arrayContaining([
      'bold', 'italic', 'underline', 'strike', 'color', 'background',
      'font', 'size', 'formula', 'align', 'link', 'code', 'code-block',
    ]));
  });
});
