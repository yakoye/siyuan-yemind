/**
 * YeMind operation icons.
 *
 * All icons share a 20×20 coordinate system, 1.5 px rounded strokes and
 * currentColor. This keeps toolbar and context-menu artwork visually aligned
 * in both light and dark themes and avoids the solid-black fills of v0.9.19.
 */
const menu = (name: string, body: string): string =>
  `<svg class="ymz-menu-icon ymz-operation-icon ymz-icon-${name}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

const toolbar = (name: string, body: string): string =>
  `<svg class="ymz-toolbar-icon ymz-operation-icon ymz-icon-${name}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

const project = (name: string, body: string): string =>
  `<svg class="ymz-project-icon ymz-operation-icon ymz-icon-${name}" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

const stroke = 'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';

export const suppliedIcons = {
  insertParent: menu('insert-parent', `<rect x="10.5" y="11.5" width="7" height="4.5" rx="1.2" ${stroke}/><rect x="2.5" y="4" width="7" height="4.5" rx="1.2" ${stroke} stroke-dasharray="2 2" opacity=".58"/><path d="M7 11.5V9.8h7V11.5M5.8 11.5h2.4M7 9.8V8.5" ${stroke}/>`),
  insertSibling: menu('insert-sibling', `<rect x="5" y="3" width="10" height="5" rx="1.3" ${stroke} stroke-dasharray="2 2" opacity=".58"/><rect x="5" y="12" width="10" height="5" rx="1.3" ${stroke}/><path d="M10 8v4" ${stroke}/>`),
  insertChild: menu('insert-child', `<rect x="2.5" y="4" width="7" height="4.5" rx="1.2" ${stroke}/><rect x="10.5" y="11.5" width="7" height="4.5" rx="1.2" ${stroke} stroke-dasharray="2 2" opacity=".58"/><path d="M7 8.5v1.3h7v1.7M5.8 9.8h2.4" ${stroke}/>`),
  outerFrame: menu('outer-frame', `<rect x="2.5" y="2.5" width="15" height="15" rx="2.4" ${stroke} stroke-dasharray="2.6 2.6"/><rect x="6.2" y="7" width="7.6" height="6" rx="1.4" ${stroke}/>`),
  summary: menu('summary', `<rect x="2.8" y="3.2" width="6.2" height="4.3" rx="1.2" ${stroke}/><rect x="2.8" y="12.5" width="6.2" height="4.3" rx="1.2" ${stroke}/><path d="M12 4.5c2.4 1.3 3.6 3.1 3.6 5.5S14.4 14.2 12 15.5M14.3 10h3" ${stroke}/>`),
  relation: menu('relation', `<rect x="2.3" y="12.4" width="3.6" height="3.6" rx=".8" ${stroke}/><path d="M5.8 12.7C7.7 6 12 4 16.4 7.2M14.8 4.9l2 2.4-2.9 1.2" ${stroke}/>`),
  projectStyle: project('project-style', `<path d="m5.2 13.8 7.9-7.9 2.8 2.8-7.9 7.9a1.5 1.5 0 0 1-2.1 0l-.7-.7a1.5 1.5 0 0 1 0-2.1Z" ${stroke}/><path d="m11.8 7.2 2.8 2.8M4 3.2v3.1M2.45 4.75h3.1M15.7 13.7v3.1M14.15 15.25h3.1" ${stroke}/>`),
  nodeStyle: menu('node-style', `<path d="M3.2 5.2h13.6M3.2 10h13.6M3.2 14.8h13.6" ${stroke}/><circle cx="7" cy="5.2" r="1.7" fill="none" ${stroke}/><circle cx="13" cy="10" r="1.7" fill="none" ${stroke}/><circle cx="8.5" cy="14.8" r="1.7" fill="none" ${stroke}/>`),
  clipart: menu('clipart', `<rect x="2.5" y="3" width="15" height="14" rx="2" ${stroke}/><circle cx="7" cy="7.2" r="1.35" ${stroke}/><path d="m4.5 14 3.6-3.7 2.5 2.3 2.2-2.1 2.7 3.5" ${stroke}/>`),
  marker: menu('marker', `<circle cx="10" cy="10" r="7" ${stroke}/><circle cx="7.5" cy="8" r=".75" fill="currentColor"/><circle cx="12.5" cy="8" r=".75" fill="currentColor"/><path d="M7.2 11.6c1.8 1.7 3.8 1.7 5.6 0" ${stroke}/>`),
  search: toolbar('search', `<circle cx="8.8" cy="8.8" r="5.4" ${stroke}/><path d="m12.8 12.8 4 4" ${stroke}/>`),
  redo: toolbar('redo', `<path d="M16.5 6.3H9.2a5.3 5.3 0 1 0 0 10.6h3" ${stroke}/><path d="m13.4 3.2 3.1 3.1-3.1 3.1" ${stroke}/>`),
  undo: toolbar('undo', `<path d="M3.5 6.3h7.3a5.3 5.3 0 1 1 0 10.6h-3" ${stroke}/><path d="m6.6 3.2-3.1 3.1 3.1 3.1" ${stroke}/>`),
  fullscreen: toolbar('fullscreen', `<path d="M7.5 3.5h-4v4M12.5 3.5h4v4M3.5 12.5v4h4M16.5 12.5v4h-4" ${stroke}/>`),
} as const;

export type SuppliedIconName = keyof typeof suppliedIcons;
export function suppliedIcon(name: SuppliedIconName): string { return suppliedIcons[name]; }
