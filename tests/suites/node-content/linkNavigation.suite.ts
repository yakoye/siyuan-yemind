import { describe, expect, it } from 'vitest';
import {
  resolveLinkNavigation,
  shouldActivateRichTextLink,
} from '../../../src/editor/linkNavigation';

describe('node and inline link navigation', () => {
  it('uses SiYuan routing and the configured external-link target', () => {
    expect(resolveLinkNavigation('siyuan://blocks/20260716120000-abcdefg', 'new-window')).toEqual({
      href: 'siyuan://blocks/20260716120000-abcdefg',
      target: 'siyuan',
    });
    expect(resolveLinkNavigation('https://example.com', 'new-window')).toEqual({
      href: 'https://example.com', target: 'new-window',
    });
    expect(resolveLinkNavigation('example.com', 'current-window')).toEqual({
      href: 'https://example.com', target: 'current-window',
    });
  });

  it('blocks unsafe or malformed stored links', () => {
    expect(resolveLinkNavigation('javascript:alert(1)', 'new-window')).toBeNull();
    expect(resolveLinkNavigation('not a url', 'new-window')).toBeNull();
  });

  it('keeps ordinary pointer gestures inside the rich-text editor and opens links explicitly', () => {
    expect(shouldActivateRichTextLink({
      button: 0,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
    })).toBe(false);
    expect(shouldActivateRichTextLink({
      button: 0,
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
    })).toBe(true);
    expect(shouldActivateRichTextLink({
      button: 0,
      ctrlKey: false,
      metaKey: true,
      shiftKey: false,
      altKey: false,
    })).toBe(true);
    expect(shouldActivateRichTextLink({
      button: 1,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
    })).toBe(true);
  });
});
