import type { YeMindLineStyle } from '../core/themePresets';
import type { CanvasMode } from '../settings/SettingsStore';
import { suppliedIcon } from './suppliedIcons';



export function fitViewIcon(): string {
  return '<svg class="ymz-toolbar-icon ymz-icon-fit-view" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H4v4M16 4h4v4M4 16v4h4M20 16v4h-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
}

export function canvasModeIcon(mode: CanvasMode): string {
  // The footer button describes the action that will happen after clicking it.
  if (mode === 'select') {
    return '<svg class="ymz-toolbar-icon ymz-icon-canvas-pan" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 11.2V7.8a1.5 1.5 0 0 1 3 0v2.6-4.1a1.5 1.5 0 0 1 3 0v4.1-3.1a1.5 1.5 0 0 1 3 0v4.1-1.9a1.5 1.5 0 0 1 3 0v5.1c0 4.1-2.8 6.4-6.6 6.4h-1.1c-2.5 0-4.1-1.1-5.4-3l-2.2-3.2a1.6 1.6 0 0 1 .4-2.2 1.7 1.7 0 0 1 2.2.3l.7.9v-2.6Z" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  return '<svg class="ymz-toolbar-icon ymz-icon-canvas-select" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 3 12.7 9.1-5.6 1.1 3.2 5.4-2.6 1.5-3.1-5.3L6 19.1 5 3Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}


export function clipboardIcon(kind: 'copy' | 'cut' | 'paste'): string {
  const base = 'class="ymz-menu-icon ymz-operation-icon';
  const stroke = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
  if (kind === 'cut') {
    return `<svg ${base} ymz-icon-cut" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="5" cy="15" r="2" ${stroke}/><circle cx="15" cy="15" r="2" ${stroke}/><path d="m6.5 13.7 7-9.2M13.5 13.7l-7-9.2" ${stroke}/></svg>`;
  }
  if (kind === 'paste') {
    return `<svg ${base} ymz-icon-paste" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="4.5" y="4.5" width="11" height="13" rx="2" ${stroke}/><path d="M7.3 4.5V3.7c0-.7.6-1.2 1.2-1.2h3c.7 0 1.2.5 1.2 1.2v.8M7.5 9h5M7.5 12.5h5" ${stroke}/></svg>`;
  }
  return `<svg ${base} ymz-icon-copy" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="7" y="6" width="9.5" height="11.5" rx="1.8" ${stroke}/><path d="M13.5 6V4.5c0-1.1-.9-2-2-2h-6c-1.1 0-2 .9-2 2V14c0 1.1.9 2 2 2H7" ${stroke}/></svg>`;
}



export type NodeInsertKind = 'sibling' | 'child' | 'parent';

/** Compact relationship icons modelled after common mind-map insert controls. */
export function nodeInsertIcon(kind: NodeInsertKind): string {
  if (kind === 'parent') return suppliedIcon('insertParent');
  if (kind === 'child') return suppliedIcon('insertChild');
  return suppliedIcon('insertSibling');
}

export const CANVAS_PROJECT_MENU_LABELS = ['结构', '主题', '线型', '样式'] as const;

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
  return suppliedIcon('summary');
}


export function projectStyleIcon(): string {
  return suppliedIcon('projectStyle');
}


export function nodeStyleIcon(): string {
  return suppliedIcon('nodeStyle');
}



export function historyIcon(): string {
  return '<svg class="ymz-toolbar-icon ymz-icon-history" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 9.2A8 8 0 1 1 5 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M4.5 4.8v4.6h4.6M12 7.5v5l3.2 1.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

export function undoIcon(): string {
  return suppliedIcon('undo');
}


export function redoIcon(): string {
  return suppliedIcon('redo');
}


export function searchIcon(): string {
  return suppliedIcon('search');
}


export function relationIcon(): string {
  return suppliedIcon('relation');
}

export function clipartIcon(): string {
  return suppliedIcon('clipart');
}

export function markerIcon(): string {
  return suppliedIcon('marker');
}

export function outerFrameIcon(): string {
  return suppliedIcon('outerFrame');
}

export function fullscreenIcon(): string {
  return suppliedIcon('fullscreen');
}


export function lockIcon(): string {
  return '<svg class="ymz-toolbar-icon ymz-icon-lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="15" r="1.2" fill="currentColor"/></svg>';
}

export function meditationIcon(): string {
  return '<svg class="ymz-toolbar-icon ymz-icon-meditation" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.3" r="2.1" fill="none" stroke="currentColor" stroke-width="1.65"/><path d="M9.4 7.2c-1.9 1-2.8 2.7-3 5.1-.2 2.1-1.2 3.5-3.2 4.3M14.6 7.2c1.9 1 2.8 2.7 3 5.1.2 2.1 1.2 3.5 3.2 4.3M8.4 11.2 12 16l3.6-4.8M3.4 17c2.7-.3 4.9.2 6.6 1.5L12 20l2-1.5c1.7-1.3 3.9-1.8 6.6-1.5M6 20h12" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
