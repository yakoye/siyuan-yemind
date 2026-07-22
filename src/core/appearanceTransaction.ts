import type { ThemeColorAppearance } from './themeColorData';
import { configureThemeColorRuntime } from './themeColorRuntime';

interface AppearanceMindMap {
  opt?: Record<string, unknown>;
  emit?(event: string, ...args: unknown[]): void;
  renderer?: {
    activeNodeList?: unknown[];
    findNodeByUid?(uid: string): unknown;
    activeMultiNode?(nodes: unknown[]): void;
    addNodeToActiveList?(node: unknown, notEmitBeforeNodeActiveEvent?: boolean): void;
    emitNodeActiveEvent?(node?: unknown): void;
  };
  setThemeConfig(config: Record<string, unknown>, notRender?: boolean): void;
  updateConfig(config: Record<string, unknown>): void;
  reRender?(callback?: () => void, source?: string): void;
  render?(callback?: () => void, source?: string): void;
}

export interface ApplyMapAppearanceOptions {
  map: AppearanceMindMap;
  themeConfig: Record<string, unknown>;
  rainbowLinesConfig: Record<string, unknown>;
  colorAppearance: ThemeColorAppearance;
  useThemeLineColors: boolean;
  rootBackground?: string;
  render?: boolean;
  afterRender?: () => void;
}

const APPEARANCE_RENDER_SOURCE = 'changeTheme';
const REVISION_BY_MAP = new WeakMap<object, number>();
const ACTIVE_NODE_UIDS_BY_MAP = new WeakMap<object, string[]>();

function readNodeUid(node: any): string | null {
  const direct = node?.getData?.('uid');
  if (typeof direct === 'string' && direct) return direct;
  const data = node?.getData?.();
  const candidates = [
    data?.uid,
    node?.nodeData?.data?.uid,
    node?.nodeData?.uid,
    node?.data?.uid,
    node?.uid,
  ];
  return candidates.find((value) => typeof value === 'string' && value) ?? null;
}


function replaceRainbowLinesConfig(
  map: AppearanceMindMap,
  config: Record<string, unknown>,
): void {
  const exact = {
    ...config,
    open: Boolean(config.open),
    colorsList: Array.isArray(config.colorsList) ? [...config.colorsList] : [],
  };
  if (map.opt && typeof map.opt === 'object') {
    const previous = { ...map.opt };
    map.emit?.('before_update_config', map.opt);
    // simple-mind-map updateConfig() deep-merges arrays and would concatenate
    // old and new palette colors. Rainbow palettes require replacement semantics.
    map.opt.rainbowLinesConfig = exact;
    map.emit?.('after_update_config', map.opt, previous);
    return;
  }
  map.updateConfig({ rainbowLinesConfig: exact });
}

function captureActiveNodeUids(map: AppearanceMindMap): string[] {
  const active = Array.isArray(map.renderer?.activeNodeList)
    ? map.renderer!.activeNodeList!
    : [];
  return [...new Set(active.map(readNodeUid).filter((uid): uid is string => Boolean(uid)))];
}

function restoreActiveNodes(map: AppearanceMindMap, uids: readonly string[]): void {
  if (uids.length === 0) return;
  const renderer = map.renderer;
  if (!renderer?.findNodeByUid) return;
  const nodes = uids
    .map((uid) => renderer.findNodeByUid?.(uid))
    .filter((node): node is NonNullable<typeof node> => Boolean(node));
  if (nodes.length === 0) return;
  if (typeof renderer.activeMultiNode === 'function') {
    renderer.activeMultiNode(nodes);
    return;
  }
  if (typeof renderer.addNodeToActiveList === 'function') {
    for (const node of nodes) renderer.addNodeToActiveList(node, true);
    renderer.emitNodeActiveEvent?.(nodes[nodes.length - 1]);
  }
}

/**
 * Apply all visual configuration as one renderer transaction.
 *
 * Theme, per-level runtime colors and rainbow-line configuration are updated
 * before a single complete redraw. This prevents the renderer from reusing
 * stale node/line caches while keeping view transform and local node styles.
 */
export function applyMapAppearanceTransaction(options: ApplyMapAppearanceOptions): void {
  const {
    map,
    themeConfig,
    rainbowLinesConfig,
    colorAppearance,
    useThemeLineColors,
    rootBackground,
    render = true,
    afterRender,
  } = options;

  configureThemeColorRuntime(map, {
    appearance: colorAppearance,
    useThemeLineColors,
    rootBackground,
  });
  map.setThemeConfig(themeConfig, true);
  replaceRainbowLinesConfig(map, rainbowLinesConfig);

  if (!render) return;

  const mapKey = map as object;
  const revision = (REVISION_BY_MAP.get(mapKey) ?? 0) + 1;
  REVISION_BY_MAP.set(mapKey, revision);

  // A full redraw temporarily clears renderer.activeNodeList. When several
  // appearance changes are requested before the first redraw completes, keep
  // the last non-empty snapshot so the newest transaction can restore it.
  const currentActiveNodeUids = captureActiveNodeUids(map);
  if (currentActiveNodeUids.length > 0) {
    ACTIVE_NODE_UIDS_BY_MAP.set(mapKey, currentActiveNodeUids);
  }
  const activeNodeUids = ACTIVE_NODE_UIDS_BY_MAP.get(mapKey) ?? [];

  const complete = (): void => {
    if (REVISION_BY_MAP.get(mapKey) !== revision) return;
    ACTIVE_NODE_UIDS_BY_MAP.delete(mapKey);
    restoreActiveNodes(map, activeNodeUids);
    afterRender?.();
  };

  if (typeof map.reRender === 'function') {
    map.reRender(complete, APPEARANCE_RENDER_SOURCE);
    return;
  }

  // Compatibility fallback for test doubles or older compatible renderers.
  // Production simple-mind-map exposes reRender(), which is always preferred.
  map.render?.(complete, APPEARANCE_RENDER_SOURCE);
}
