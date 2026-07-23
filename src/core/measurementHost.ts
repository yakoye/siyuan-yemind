interface MindMapMeasurementCaches {
  measureRichtextNodeTextSizeEl?: HTMLElement | null;
  measureCustomNodeContentSizeEl?: HTMLElement | null;
}

interface MindMapMeasurementTarget {
  commonCaches?: MindMapMeasurementCaches;
  render?: (callback?: (() => void) | null, source?: string) => void;
  on?: (event: string, callback: () => void) => void;
}

const registeredMaps = new WeakSet<object>();
const hosts = new WeakMap<object, HTMLElement>();
const repairScheduled = new WeakSet<object>();

function measurementElements(map: MindMapMeasurementTarget): HTMLElement[] {
  const caches = map.commonCaches;
  if (!caches) return [];
  return [caches.measureRichtextNodeTextSizeEl, caches.measureCustomNodeContentSizeEl]
    .filter((element): element is HTMLElement => element instanceof HTMLElement);
}

function copyMeasurementContext(host: HTMLElement, editorRoot: HTMLElement): void {
  host.className = `${editorRoot.className} ymz-measurement-host`.trim();
  for (const attribute of Array.from(editorRoot.attributes)) {
    if (attribute.name.startsWith('data-')) host.setAttribute(attribute.name, attribute.value);
  }
  const computed = getComputedStyle(editorRoot);
  host.style.fontFamily = computed.fontFamily;
  host.style.fontSize = computed.fontSize;
  host.style.fontWeight = computed.fontWeight;
  host.style.lineHeight = computed.lineHeight;
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed[index];
    if (property.startsWith('--')) host.style.setProperty(property, computed.getPropertyValue(property));
  }
}

function getHost(map: MindMapMeasurementTarget, editorRoot: HTMLElement): HTMLElement {
  const key = map as object;
  const existing = hosts.get(key);
  if (existing?.isConnected) {
    copyMeasurementContext(existing, editorRoot);
    return existing;
  }
  const host = document.createElement('div');
  host.dataset.yemindMeasurementHost = 'true';
  host.setAttribute('aria-hidden', 'true');
  Object.assign(host.style, {
    position: 'fixed',
    left: '-100000px',
    top: '0',
    display: 'block',
    width: '10000px',
    height: 'auto',
    minWidth: '0',
    minHeight: '0',
    overflow: 'visible',
    visibility: 'hidden',
    pointerEvents: 'none',
    zIndex: '-1',
  });
  copyMeasurementContext(host, editorRoot);
  document.body.appendChild(host);
  hosts.set(key, host);
  return host;
}

function moveMeasurementElements(map: MindMapMeasurementTarget, host: HTMLElement): boolean {
  let moved = false;
  measurementElements(map).forEach((element) => {
    element.dataset.yemindMeasurementOwner = 'true';
    element.setAttribute('aria-hidden', 'true');
    if (element.parentElement !== host) {
      host.appendChild(element);
      moved = true;
    }
  });
  return moved;
}

function scheduleFullGeometryRepair(map: MindMapMeasurementTarget): void {
  const key = map as object;
  if (repairScheduled.has(key)) return;
  repairScheduled.add(key);
  const run = (): void => {
    repairScheduled.delete(key);
    map.render?.(null, 'yemind-measurement-host');
  };
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(run);
  } else {
    queueMicrotask(run);
  }
}

/**
 * Keep simple-mind-map's DOM measurement caches in a visible, off-screen host.
 * The host preserves the editor's scoped CSS and variables even when a SiYuan
 * tab is display:none. A relocation is repaired with one full render so node
 * shape, text and layout are recalculated in the same render generation.
 */
export function stabilizeMindMapMeasurementHost(
  map: MindMapMeasurementTarget,
  editorRoot: HTMLElement = document.body,
): boolean {
  const context = editorRoot.closest<HTMLElement>('.ymz-editor') ?? editorRoot;
  const relocate = (): boolean => {
    const moved = moveMeasurementElements(map, getHost(map, context));
    if (moved) scheduleFullGeometryRepair(map);
    return moved;
  };

  const moved = relocate();
  if (!registeredMaps.has(map as object)) {
    registeredMaps.add(map as object);
    map.on?.('node_tree_render_end', relocate);
    map.on?.('beforeDestroy', () => {
      hosts.get(map as object)?.remove();
      hosts.delete(map as object);
    });
    queueMicrotask(relocate);
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(relocate);
    }
  }
  return moved;
}
