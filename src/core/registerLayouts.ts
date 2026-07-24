import MindMap from 'simple-mind-map';
import RightFishbone from './RightFishbone';

let registered = false;

/** Register layouts that upstream exposes as constants but does not install. */
export function registerMindMapLayouts(): void {
  if (registered) return;
  const prototype = (MindMap as any).prototype;
  prototype.rightFishbone = RightFishbone;
  prototype.rightFishbone2 = RightFishbone;
  registered = true;
}
