import { describe, expect, it } from 'vitest';
import { isSiyuanInlineLink, normalizeInlineLink } from '../../../src/editor/inlineLink';

describe('inline link helpers', () => {
  it('normalizes bare domains when auto HTTPS is enabled', () => {
    expect(normalizeInlineLink('example.com/docs', true)).toBe('https://example.com/docs');
    expect(normalizeInlineLink('example.com/docs', false)).toBeNull();
  });

  it('preserves supported URL schemes and rejects unsafe schemes', () => {
    expect(normalizeInlineLink('https://example.com', true)).toBe('https://example.com');
    expect(normalizeInlineLink('mailto:test@example.com', true)).toBe('mailto:test@example.com');
    expect(normalizeInlineLink('tel:+8613800000000', true)).toBe('tel:+8613800000000');
    expect(normalizeInlineLink('siyuan://blocks/20260716120000-abcdefg', true)).toBe('siyuan://blocks/20260716120000-abcdefg');
    expect(normalizeInlineLink('javascript:alert(1)', true)).toBeNull();
  });

  it('detects SiYuan links', () => {
    expect(isSiyuanInlineLink('siyuan://blocks/20260716120000-abcdefg')).toBe(true);
    expect(isSiyuanInlineLink('https://example.com')).toBe(false);
  });
});
