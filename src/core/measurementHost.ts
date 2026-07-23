interface MindMapMeasurementCaches {
  measureRichtextNodeTextSizeEl?: HTMLElement | null;
  measureCustomNodeContentSizeEl?: HTMLElement | null;
}

interface MindMapMeasurementTarget {
  commonCaches?: MindMapMeasurementCaches;
  reRender?: (callback?: (() => void) | null, source?: string) => void;
  on?: (event: string, callback: () => void) => void;
}

const registeredMaps = new WeakSet<object>();

function measurementElements(map: MindMapMeasurementTarget): HTMLElement[] {
  const caches = map.commonCaches;
  if (!caches) return [];
  return [
    caches.measureRichtextNodeTextSizeEl,
    caches.measureCustomNodeContentSizeEl,
  ].filter((element): element is HTMLElement => element instanceof HTMLElement);
}

function moveMeasurementElements(map: MindMapMeasurementTarget, target: HTMLElement): boolean {
  let moved = false;
  measurementElements(map).forEach((element) => {
    if (element.parentElement === target) return;
    element.dataset.yemindMeasurementOwner = 'true';
    element.setAttribute('aria-hidden', 'true');
    target.appendChild(element);
    moved = true;
  });
  return moved;
}

/**
 * simple-mind-map creates rich-text measurement nodes inside its canvas.
 * SiYuan can keep inactive tabs mounted with a hidden canvas, which makes
 * getBoundingClientRect() return zero and collapses text nodes into pills.
 */
export function stabilizeMindMapMeasurementHost(
  map: MindMapMeasurementTarget,
  target: HTMLElement = document.body,
): boolean {
  const relocate = (): boolean => {
    const moved = moveMeasurementElements(map, target);
    if (moved) map.reRender?.(null, 'yemind-measurement-host');
    return moved;
  };

  const moved = relocate();
  if (!registeredMaps.has(map as object)) {
    registeredMaps.add(map as object);
    // The upstream cache elements can be created during the first render,
    // after the MindMap constructor returns. Recheck at render completion.
    map.on?.('node_tree_render_end', relocate);
    map.on?.('beforeDestroy', () => {
      measurementElements(map).forEach((element) => element.remove());
    });
    queueMicrotask(relocate);
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(relocate);
    }
  }
  return moved;
}
