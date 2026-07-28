import type { YeMindLineStyle } from '../core/themePresets';
import type { AppearanceMode } from '../core/appearanceMode';
import type { CanvasMode } from '../settings/SettingsStore';
import { suppliedIcon } from './suppliedIcons';

function iconSlot(content: string, modifier = ''): string {
  const suffix = modifier ? ` ${modifier}` : '';
  return `<span class="ymz-icon-slot${suffix}" aria-hidden="true">${content}</span>`;
}


export function fitViewIcon(): string {
  return '<svg class="ymz-toolbar-icon ymz-icon-fit-view" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 3-5 5m0-5v5h5m8-5 5 5m0-5v5h-5M8 21l-5-5m0 5v-5h5m8 5 5-5m0 5v-5h-5" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

export function canvasModeIcon(mode: CanvasMode): string {
  if (mode === 'select') {
    return '<svg class="ymz-toolbar-icon ymz-icon-canvas-select" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 3 12.7 9.1-5.6 1.1 3.2 5.4-2.6 1.5-3.1-5.3L6 19.1 5 3Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  return '<svg class="ymz-toolbar-icon ymz-icon-canvas-pan" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 11.2V7.8a1.5 1.5 0 0 1 3 0v2.6-4.1a1.5 1.5 0 0 1 3 0v4.1-3.1a1.5 1.5 0 0 1 3 0v4.1-1.9a1.5 1.5 0 0 1 3 0v5.1c0 4.1-2.8 6.4-6.6 6.4h-1.1c-2.5 0-4.1-1.1-5.4-3l-2.2-3.2a1.6 1.6 0 0 1 .4-2.2 1.7 1.7 0 0 1 2.2.3l.7.9v-2.6Z" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

export function appearanceIcon(mode: AppearanceMode): string {
  if (mode === 'light') {
    return '<svg class="ymz-toolbar-icon ymz-icon-appearance-light" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  }
  if (mode === 'dark') {
    return '<svg class="ymz-toolbar-icon ymz-icon-appearance-dark" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.8 15.2A8 8 0 0 1 8.8 4.2 8.1 8.1 0 1 0 19.8 15.2Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
  }
  return '<svg class="ymz-toolbar-icon ymz-icon-appearance-system ymz-icon-appearance-auto" viewBox="0 0 24 24" aria-hidden="true"><path class="ymz-appearance-sun" d="M12 3v2.2M5.64 5.64 7.2 7.2M3 12h2.2M5.64 18.36 7.2 16.8" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"/><path class="ymz-appearance-moon" d="M19.2 14.4A7.2 7.2 0 0 1 9.6 4.8a7.4 7.4 0 1 0 9.6 9.6Z" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round"/></svg>';
}

export function transferIcon(kind: 'import' | 'export'): string {
  const arrow = kind === 'import' ? 'M12 4v10m-4-4 4 4 4-4' : 'M12 14V4m-4 4 4-4 4 4';
  return `<svg class="ymz-toolbar-icon ymz-icon-transfer ymz-icon-transfer--${kind}" viewBox="0 0 24 24" aria-hidden="true"><path d="${arrow}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 14v5h14v-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export function zoomIcon(kind: 'in' | 'out'): string {
  const vertical = kind === 'in' ? '<path d="M12 8v8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' : '';
  return `<svg class="ymz-toolbar-icon ymz-icon-zoom ymz-icon-zoom--${kind}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 12h8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>${vertical}<path d="m16 16 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
}

export function helpIcon(): string {
  return '<svg class="ymz-toolbar-icon ymz-icon-help" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9.7 9a2.5 2.5 0 1 1 3.3 2.4c-.8.3-1 1-1 1.8v.3M12 17.5h.01" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
}

export function resetZoomIcon(): string {
  return '<svg class="ymz-toolbar-icon ymz-icon-reset-zoom" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

export function miniMapIcon(): string {
  return '<svg class="ymz-toolbar-icon ymz-icon-minimap" viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3V6Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 3v15M16 6v15" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/></svg>';
}

export function presentationIcon(): string {
  return '<svg class="ymz-toolbar-icon ymz-icon-presentation" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m10 8 5 2.5-5 2.5V8ZM12 17v4M8 21h8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

export function brandIcon(): string {
  return '<svg class="ymz-brand-icon ymz-brand-icon--network" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7.5" fill="#22c9a0"/><g fill="none" stroke="#fff" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><rect class="ymz-brand-node" x="11" y="11" width="10" height="10" rx="2.4"/><path d="M11.8 12 8 8.2M20.2 12 24 8.2M11 16H6.5M21 16h4.5M11.8 20 8 23.8M20.2 20l3.8 3.8"/></g><g fill="#fff"><circle cx="6.6" cy="6.8" r="2.1"/><circle cx="25.4" cy="6.8" r="2.1"/><circle cx="4.5" cy="16" r="2.1"/><circle cx="27.5" cy="16" r="2.1"/><circle cx="6.6" cy="25.2" r="2.1"/><circle cx="25.4" cy="25.2" r="2.1"/></g></svg>';
}

export function primaryViewIcon(kind: 'map' | 'outline' | 'cards' | 'review'): string {
  const paths = {
    map: '<g class="ymz-primary-view-icon--map-network" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><rect class="ymz-map-root" x="9" y="8.5" width="6" height="7" rx="1.5"/><path d="M9 12H5.5M15 10h2.2M15 14h2.2"/><circle cx="4" cy="12" r="1.35"/><rect x="17.2" y="7.8" width="3.2" height="3.2" rx=".8"/><rect x="17.2" y="12.9" width="3.2" height="3.2" rx=".8"/></g>',
    outline: '<path d="M8 6h11M8 12h11M8 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    cards: '<rect x="4" y="5" width="12" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 2h10a2 2 0 0 1 2 2v12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    review: '<path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v17H8.5A3.5 3.5 0 0 0 5 22V5.5ZM19 5.5A3.5 3.5 0 0 0 15.5 2H12v17h3.5A3.5 3.5 0 0 1 19 22V5.5Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  } as const;
  return `<svg class="ymz-toolbar-icon ymz-primary-view-icon ymz-primary-view-icon--${kind}" viewBox="0 0 24 24" aria-hidden="true">${paths[kind]}</svg>`;
}

export function shareIcon(): string {
  return '<svg class="ymz-toolbar-icon ymz-icon-share" viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="6" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="18" cy="19" r="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
}

export function saveIcon(): string {
  return '<svg class="ymz-toolbar-icon ymz-icon-save" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h12l2 2v16H5V3Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 3v6h8V3M8 21v-7h8v7" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
}

export function clipboardIcon(kind: 'copy' | 'cut' | 'paste'): string {
  const base = 'class="ymz-menu-icon';
  const stroke = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
  if (kind === 'cut') {
    return iconSlot(`<svg ${base} ymz-icon-cut" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="15" r="2" ${stroke}/><circle cx="15" cy="15" r="2" ${stroke}/><path d="m6.5 13.7 7-9.2M13.5 13.7l-7-9.2" ${stroke}/></svg>`, 'ymz-icon-slot--menu');
  }
  if (kind === 'paste') {
    return iconSlot(`<svg ${base} ymz-icon-paste" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect x="4.5" y="4.5" width="11" height="13" rx="2" ${stroke}/><path d="M7.3 4.5V3.7c0-.7.6-1.2 1.2-1.2h3c.7 0 1.2.5 1.2 1.2v.8M7.5 9h5M7.5 12.5h5" ${stroke}/></svg>`, 'ymz-icon-slot--menu');
  }
  return iconSlot(`<svg ${base} ymz-icon-copy" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><rect x="7" y="6" width="9.5" height="11.5" rx="1.8" ${stroke}/><path d="M13.5 6V4.5c0-1.1-.9-2-2-2h-6c-1.1 0-2 .9-2 2V14c0 1.1.9 2 2 2H7" ${stroke}/></svg>`, 'ymz-icon-slot--menu');
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
    return iconSlot('<svg class="ymz-project-icon ymz-icon-structure" viewBox="0 0 24 24"><path d="M12 3v4M5 10h14M5 10v4M12 10v4M19 10v4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="2.5" y="14" width="5" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="9.5" y="14" width="5" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="16.5" y="14" width="5" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="9.5" y="2" width="5" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>', 'ymz-icon-slot--project');
  }
  return iconSlot('<svg class="ymz-project-icon ymz-icon-theme" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.2 4.2 10 2.8h4l1.8 1.4 3.2 1.2-1.5 4.1V21H6.5V9.5L5 5.4l3.2-1.2Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8.2 4.2c.8 1.7 2 2.6 3.8 2.6s3-.9 3.8-2.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>', 'ymz-icon-slot--project');
}

export function lineStyleIcon(style: unknown): string {
  const normalized: YeMindLineStyle = style === 'straight' || style === 'direct' ? style : 'curve';
  const path = normalized === 'curve'
    ? 'M3 18C8 18 8 6 14 6h7'
    : normalized === 'straight'
      ? 'M3 18h8V6h10'
      : 'M3 18 14 6h7';
  return iconSlot(`<svg class="ymz-line-icon ymz-line-icon--${normalized}" viewBox="0 0 24 24"><path d="${path}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`, 'ymz-icon-slot--project');
}


export function summaryIcon(): string {
  return suppliedIcon('summary');
}


export function projectStyleIcon(): string {
  return iconSlot('<svg class="ymz-project-icon ymz-icon-project-style" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h3M11 12h9M4 18h8M16 18h4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="16" cy="6" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="14" cy="18" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>', 'ymz-icon-slot--project');
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
  return '<svg class="ymz-toolbar-icon ymz-icon-fullscreen" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5H5v4M15 5h4v4M9 19H5v-4M15 19h4v-4M5.5 8.5 9 5M15 5l3.5 3.5M5.5 15.5 9 19M15 19l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}



export function pinIcon(pinned = false): string {
  if (pinned) {
    return '<svg class="ymz-toolbar-icon ymz-icon-pin ymz-icon-pin--fixed" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8l-.8 5 2.8 2.8v1.7H13v7L12 21l-1-1.5v-7H6v-1.7L8.8 8 8 3Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  return '<svg class="ymz-toolbar-icon ymz-icon-pin ymz-icon-pin--auto" viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(-38 12 12)"><path d="M8 3h8l-.8 5 2.8 2.8v1.7H13v7L12 21l-1-1.5v-7H6v-1.7L8.8 8 8 3Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></g></svg>';
}

export function lockIcon(locked = false): string {
  if (locked) {
    return '<svg class="ymz-toolbar-icon ymz-icon-lock ymz-icon-lock--closed" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="15" r="1.2" fill="currentColor"/></svg>';
  }
  return '<svg class="ymz-toolbar-icon ymz-icon-lock ymz-icon-lock--open" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9 10V7.5a4 4 0 0 1 7.2-2.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="15" r="1.2" fill="currentColor"/></svg>';
}

export function meditationIcon(): string {
  return '<svg class="ymz-toolbar-icon ymz-icon-meditation" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.3" r="2.1" fill="none" stroke="currentColor" stroke-width="1.65"/><path d="M9.4 7.2c-1.9 1-2.8 2.7-3 5.1-.2 2.1-1.2 3.5-3.2 4.3M14.6 7.2c1.9 1 2.8 2.7 3 5.1.2 2.1 1.2 3.5 3.2 4.3M8.4 11.2 12 16l3.6-4.8M3.4 17c2.7-.3 4.9.2 6.6 1.5L12 20l2-1.5c1.7-1.3 3.9-1.8 6.6-1.5M6 20h12" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
