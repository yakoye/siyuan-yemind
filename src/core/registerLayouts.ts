import MindMap from 'simple-mind-map';
import RightFishbone from './RightFishbone';
import { PRESET_LAYOUT_CLASSES } from './PresetLayouts';
import { layoutGeometryByEngine } from './layoutGeometry';

let registered = false;
const LAYOUT_BRIDGE_FLAG = '__yemindPresetLayoutBridgeInstalled';

function installPresetLayoutBridge(prototype: any): void {
  if (prototype[LAYOUT_BRIDGE_FLAG]) return;
  const upstreamHandleOpt = prototype.handleOpt;
  const upstreamSetLayout = prototype.setLayout;

  prototype.handleOpt = function handleYeMindLayoutOptions(options: any): any {
    const requested = layoutGeometryByEngine(options?.layout);
    if (!requested) return upstreamHandleOpt.call(this, options);
    const normalized = upstreamHandleOpt.call(this, {
      ...options,
      layout: requested.baseLayout,
    });
    normalized.layout = requested.engineLayout;
    return normalized;
  };

  prototype.setLayout = function setYeMindLayout(layout: string, notRender = false): void {
    const requested = layoutGeometryByEngine(layout);
    if (!requested) {
      upstreamSetLayout.call(this, layout, notRender);
      return;
    }
    this.opt.layout = requested.engineLayout;
    this.view.reset();
    this.renderer.setLayout();
    if (!notRender) this.render(null, 'changeLayout');
    this.emit('layout_change', requested.engineLayout);
  };

  Object.defineProperty(prototype, LAYOUT_BRIDGE_FLAG, {
    configurable: false,
    enumerable: false,
    value: true,
  });
}

/** Register layouts that upstream exposes as constants but does not install. */
export function registerMindMapLayouts(): void {
  if (registered) return;
  const prototype = (MindMap as any).prototype;
  installPresetLayoutBridge(prototype);
  prototype.rightFishbone = RightFishbone;
  prototype.rightFishbone2 = RightFishbone;
  Object.entries(PRESET_LAYOUT_CLASSES).forEach(([layout, LayoutClass]) => {
    prototype[layout] = LayoutClass;
  });
  registered = true;
}
