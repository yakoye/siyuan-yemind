import type { ThemeColorAppearance, ThemeColorBranch } from './themeColorData';

export interface ResolvedThemeNodeColors {
  fillColor: string;
  color: string;
  lineColor?: string;
}

export interface ThemeColorRuntimeConfig {
  appearance: ThemeColorAppearance | null;
  useThemeLineColors: boolean;
}

interface TreeNodeLike {
  data?: Record<string, unknown>;
  children?: TreeNodeLike[];
}

interface NodePosition {
  layerIndex: number;
  branchIndex: number;
}

const STYLE_KEYS = ['fillColor', 'color', 'lineColor'] as const;
type RuntimeStyleKey = typeof STYLE_KEYS[number];

export function normalizeThemeBranchIndex(branchIndex: number, cycleLength: number): number {
  const safeCycle = [1, 3, 4, 6].includes(cycleLength) ? cycleLength : 1;
  const safeIndex = Number.isFinite(branchIndex) ? Math.trunc(branchIndex) : 0;
  return ((safeIndex % safeCycle) + safeCycle) % safeCycle;
}

export function resolveThemeBranch(
  appearance: ThemeColorAppearance,
  branchIndex: number,
): ThemeColorBranch {
  const index = normalizeThemeBranchIndex(branchIndex, appearance.cycleLength);
  return appearance.branches[index] ?? appearance.branches[0];
}

export function resolveThemeNodeColors(
  appearance: ThemeColorAppearance,
  layerIndex: number,
  branchIndex: number,
): ResolvedThemeNodeColors {
  if (layerIndex <= 0) {
    return {
      fillColor: appearance.centerBackground,
      color: appearance.centerText,
    };
  }
  const branch = resolveThemeBranch(appearance, branchIndex);
  if (layerIndex === 1) {
    return {
      fillColor: branch.level1Background,
      color: branch.level1Text,
      lineColor: branch.centerToLevel1Line,
    };
  }
  if (layerIndex === 2) {
    return {
      fillColor: branch.level2Background,
      color: branch.level2Text,
      lineColor: branch.level1ToLevel2Line,
    };
  }
  return {
    fillColor: branch.normalBackground,
    color: branch.normalText,
    lineColor: branch.level2ToNormalLine,
  };
}

class ThemeColorRuntime {
  private config: ThemeColorRuntimeConfig = { appearance: null, useThemeLineColors: false };
  private readonly positionByData = new WeakMap<Record<string, unknown>, NodePosition>();
  private readonly ownedGetters = new WeakSet<Function>();

  configure(config: ThemeColorRuntimeConfig): void {
    this.config = config;
  }

  prepareTree(tree: TreeNodeLike | null | undefined): void {
    if (!tree) return;
    this.prepareNode(tree, 0, 0);
  }

  private prepareNode(node: TreeNodeLike, layerIndex: number, branchIndex: number): void {
    const data = node.data;
    if (data && typeof data === 'object') {
      this.positionByData.set(data, { layerIndex, branchIndex });
      this.syncAccessor(data, 'fillColor', true);
      this.syncAccessor(data, 'color', true);
      this.syncAccessor(data, 'lineColor', layerIndex > 0 && this.config.useThemeLineColors);
    }
    const children = Array.isArray(node.children) ? node.children : [];
    children.forEach((child, index) => {
      this.prepareNode(child, layerIndex + 1, layerIndex === 0 ? index : branchIndex);
    });
  }

  private isOwnedAccessor(data: Record<string, unknown>, key: RuntimeStyleKey): boolean {
    const descriptor = Object.getOwnPropertyDescriptor(data, key);
    return Boolean(descriptor?.get && this.ownedGetters.has(descriptor.get));
  }

  private syncAccessor(data: Record<string, unknown>, key: RuntimeStyleKey, enabled: boolean): void {
    if (!enabled || !this.config.appearance) {
      if (this.isOwnedAccessor(data, key)) delete data[key];
      return;
    }
    if (this.isOwnedAccessor(data, key)) return;
    const descriptor = Object.getOwnPropertyDescriptor(data, key);
    if (descriptor && descriptor.value !== undefined && descriptor.value !== null) return;

    const getter = () => this.resolveValue(data, key);
    this.ownedGetters.add(getter);
    Object.defineProperty(data, key, {
      configurable: true,
      enumerable: false,
      get: getter,
      set: (value: unknown) => {
        Object.defineProperty(data, key, {
          configurable: true,
          enumerable: true,
          writable: true,
          value,
        });
      },
    });
  }

  private resolveValue(data: Record<string, unknown>, key: RuntimeStyleKey): string | undefined {
    const appearance = this.config.appearance;
    const position = this.positionByData.get(data);
    if (!appearance || !position) return undefined;
    return resolveThemeNodeColors(appearance, position.layerIndex, position.branchIndex)[key];
  }
}

const RUNTIME_BY_MAP = new WeakMap<object, ThemeColorRuntime>();

export function installThemeColorRuntime(mindMap: any): void {
  if (!mindMap || typeof mindMap !== 'object' || RUNTIME_BY_MAP.has(mindMap)) return;
  const runtime = new ThemeColorRuntime();
  RUNTIME_BY_MAP.set(mindMap, runtime);
  const renderer = mindMap.renderer;
  if (!renderer || typeof renderer._render !== 'function') return;
  const originalRender = renderer._render;
  renderer._render = function patchedThemeColorRender(this: any, ...args: unknown[]) {
    runtime.prepareTree(this.renderTree);
    return originalRender.apply(this, args);
  };
  runtime.prepareTree(renderer.renderTree);
}

export function configureThemeColorRuntime(mindMap: any, config: ThemeColorRuntimeConfig): void {
  if (!RUNTIME_BY_MAP.has(mindMap)) installThemeColorRuntime(mindMap);
  const runtime = RUNTIME_BY_MAP.get(mindMap);
  runtime?.configure(config);
  runtime?.prepareTree(mindMap?.renderer?.renderTree);
}
