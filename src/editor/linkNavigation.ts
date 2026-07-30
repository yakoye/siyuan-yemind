import type { ExternalLinkMode } from '../settings/SettingsStore';
import { normalizeInlineLink } from './inlineLink';

export type LinkNavigationTarget = 'siyuan' | ExternalLinkMode;

export interface ResolvedLinkNavigation {
  href: string;
  target: LinkNavigationTarget;
}

export interface RichTextLinkPointerGesture {
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/**
 * Rich-text links live inside an editable surface, so an ordinary click must
 * remain available for caret placement, range selection and double-click
 * editing. A deliberate modifier click (or the browser's middle-click
 * gesture) activates the link without stealing the editing transaction.
 */
export function shouldActivateRichTextLink(
  gesture: RichTextLinkPointerGesture,
): boolean {
  return gesture.button === 1 || gesture.ctrlKey || gesture.metaKey;
}

export function resolveLinkNavigation(
  value: string,
  externalMode: ExternalLinkMode,
): ResolvedLinkNavigation | null {
  const href = normalizeInlineLink(value, true);
  if (!href) return null;
  return {
    href,
    target: href.toLowerCase().startsWith('siyuan://') ? 'siyuan' : externalMode,
  };
}
