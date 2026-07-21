import type { YeMindLineStyle } from '../core/themePresets';

export const CANVAS_PROJECT_MENU_LABELS = ['结构', '主题', '线型'] as const;

export type ProjectControlKind = 'layout' | 'theme';

export function projectControlIcon(kind: ProjectControlKind): string {
  if (kind === 'layout') {
    return '<svg class="ymz-project-icon ymz-icon-structure" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v4M5 10h14M5 10v4M12 10v4M19 10v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="2.5" y="14" width="5" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="9.5" y="14" width="5" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="16.5" y="14" width="5" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="9.5" y="2" width="5" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  }
  return '<svg class="ymz-project-icon ymz-icon-theme" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.2 4.2 10 2.8h4l1.8 1.4 3.2 1.2-1.5 4.1V21H6.5V9.5L5 5.4l3.2-1.2Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.2 4.2c.8 1.7 2 2.6 3.8 2.6s3-.9 3.8-2.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
}

export function lineStyleIcon(style: unknown): string {
  const normalized: YeMindLineStyle = style === 'straight' || style === 'direct' ? style : 'curve';
  const path = normalized === 'curve'
    ? 'M3 18C8 18 8 6 14 6h7'
    : normalized === 'straight'
      ? 'M3 18h8V6h10'
      : 'M3 18 14 6h7';
  return `<svg class="ymz-line-icon ymz-line-icon--${normalized}" viewBox="0 0 24 24" aria-hidden="true"><path d="${path}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}


export function summaryIcon(): string {
  return '<svg class="ymz-menu-icon ymz-icon-summary" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4c-2 0-3 2-3 4v2c0 1.5-.7 2.5-2 3 1.3.5 2 1.5 2 3v1c0 2 1 3 3 3M17 4c2 0 3 2 3 4v2c0 1.5.7 2.5 2 3-1.3.5-2 1.5-2 3v1c0 2-1 3-3 3M8 12h8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
}

export function nodeStyleIcon(): string {
  return '<svg class="ymz-project-icon ymz-icon-node-style" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.5h14M5 12h14M5 17.5h8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="8" cy="6.5" r="1.8" fill="var(--b3-theme-background,currentColor)" stroke="currentColor" stroke-width="1.5"/><circle cx="15" cy="12" r="1.8" fill="var(--b3-theme-background,currentColor)" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="17.5" r="1.8" fill="var(--b3-theme-background,currentColor)" stroke="currentColor" stroke-width="1.5"/></svg>';
}
