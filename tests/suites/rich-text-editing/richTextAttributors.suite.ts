import { describe, expect, it } from 'vitest';
import Quill from 'quill';
import {
  registerYeMindFormats,
  YEMIND_FONT_VALUES,
  YEMIND_SIZE_VALUES,
} from '../../../src/editor/YeMindRichText';

describe('rich-text toolbar formats', () => {
  it('registers every visible font and pixel size with Quill', () => {
    registerYeMindFormats();
    const font = Quill.import('attributors/style/font') as { whitelist?: string[] };
    const size = Quill.import('attributors/style/size') as { whitelist?: string[] };

    expect(font.whitelist).toEqual(expect.arrayContaining([...YEMIND_FONT_VALUES]));
    expect(size.whitelist).toEqual(expect.arrayContaining([...YEMIND_SIZE_VALUES]));
  });
});
