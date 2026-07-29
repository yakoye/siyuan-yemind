interface SiYuanTabLike {
  id?: string;
  parent?: {
    removeTab?: (id: string) => void;
  };
  headElement?: HTMLElement | {
    isConnected?: boolean;
    classList?: { contains(name: string): boolean };
    click?: () => void;
    getAttribute?(name: string): string | null;
    querySelector?<T extends Element = Element>(selectors: string): T | null;
  };
  model?: {
    type?: string;
    data?: { mapId?: unknown };
  };
  close?: () => void;
}

interface SiYuanCustomLike {
  data?: { mapId?: unknown };
  tab?: SiYuanTabLike;
}

interface SiYuanLayoutLike {
  children?: unknown[];
}

export function closeSiYuanTab(tab: SiYuanTabLike | null | undefined): boolean {
  if (!tab) return false;
  if (tab.parent?.removeTab && tab.id) {
    tab.parent.removeTab(tab.id);
    return true;
  }
  if (typeof tab.close === 'function') {
    tab.close();
    return true;
  }
  const closeButton = tab.headElement?.querySelector?.<HTMLElement>(
    '[data-type="close"], .item__close',
  );
  if (closeButton) {
    closeButton.click();
    return true;
  }
  return false;
}

function isActive(custom: SiYuanCustomLike): boolean {
  const classes = custom.tab?.headElement?.classList;
  return Boolean(
    classes?.contains('item--focus')
    || classes?.contains('item--active')
    || classes?.contains('is-active'),
  );
}

/**
 * SiYuan restores inactive custom tabs lazily, so their addTab `init` callback
 * may not run until the user activates them. This startup sweep operates on
 * Plugin.getOpenedTab(), which includes those lazy Custom models, and keeps
 * one tab per persisted YeMind map before a second editor can be mounted.
 */
export function deduplicateRestoredMapTabs(
  opened: Record<string, SiYuanCustomLike[]> | null | undefined,
): number {
  const groups = new Map<string, SiYuanCustomLike[]>();
  Object.values(opened ?? {}).flat().forEach((custom) => {
    const mapId = String(custom?.data?.mapId ?? '').trim();
    if (!mapId || !custom?.tab) return;
    const group = groups.get(mapId) ?? [];
    group.push(custom);
    groups.set(mapId, group);
  });

  let closed = 0;
  groups.forEach((group) => {
    if (group.length < 2) return;
    const keeper = group.find(isActive) ?? group[0];
    group.forEach((custom) => {
      if (custom === keeper) return;
      if (closeSiYuanTab(custom.tab)) closed += 1;
    });
  });
  return closed;
}

export function activateRestoredMapTab(
  restored: SiYuanCustomLike[] | null | undefined,
  mapId: string,
): boolean {
  const normalizedMapId = String(mapId ?? '').trim();
  if (!normalizedMapId) return false;
  const matches = (restored ?? []).filter((custom) => (
    String(custom?.data?.mapId ?? '').trim() === normalizedMapId
    && custom.tab?.headElement?.isConnected !== false
  ));
  const target = matches.find(isActive) ?? matches[0];
  const head = target?.tab?.headElement;
  if (!head || typeof head.click !== 'function') return false;
  head.click();
  return true;
}

function lazyCustomData(
  tab: SiYuanTabLike,
  customModelType: string,
): { mapId?: unknown } | null {
  if (tab.model?.type === customModelType) return tab.model.data ?? null;
  const serialized = tab.headElement?.getAttribute?.('data-initdata');
  if (!serialized) return null;
  try {
    const parsed = JSON.parse(serialized) as {
      instance?: unknown;
      customModelType?: unknown;
      customModelData?: { mapId?: unknown };
    };
    if (
      parsed.instance !== 'Custom'
      || parsed.customModelType !== customModelType
    ) {
      return null;
    }
    return parsed.customModelData ?? null;
  } catch {
    return null;
  }
}

export function collectRestoredMapTabsFromLayout(
  layout: SiYuanLayoutLike | null | undefined,
  customModelType: string,
): SiYuanCustomLike[] {
  const result: SiYuanCustomLike[] = [];
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    const candidate = value as SiYuanLayoutLike & SiYuanTabLike;
    if (candidate.id && candidate.headElement) {
      const data = lazyCustomData(candidate, customModelType);
      if (String(data?.mapId ?? '').trim()) result.push({ data: data ?? undefined, tab: candidate });
      return;
    }
    (candidate.children ?? []).forEach(visit);
  };
  visit(layout);
  return result;
}
