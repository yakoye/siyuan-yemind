export type ResourceActionIconName = 'replace' | 'delete';

const ICONS: Record<ResourceActionIconName, string> = {
  replace: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4.75 8.25V4.75h3.5M19.25 15.75v3.5h-3.5M5.2 7.35A7.5 7.5 0 0 1 18.1 6l1.15 1.45M18.8 16.65A7.5 7.5 0 0 1 5.9 18l-1.15-1.45" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/><rect x="8.25" y="8.25" width="7.5" height="7.5" rx="1.35" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  delete: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5.25 7.25h13.5M9 7.25V4.8h6v2.45M7.25 7.25l.7 12h8.1l.7-12M10 10.25v5.75M14 10.25v5.75" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

export function resourceActionIcon(name: ResourceActionIconName): string {
  return ICONS[name];
}
