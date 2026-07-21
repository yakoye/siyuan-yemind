import type { ExternalLinkMode } from '../settings/SettingsStore';
import { normalizeInlineLink } from './inlineLink';

export type LinkNavigationTarget = 'siyuan' | ExternalLinkMode;

export interface ResolvedLinkNavigation {
  href: string;
  target: LinkNavigationTarget;
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
