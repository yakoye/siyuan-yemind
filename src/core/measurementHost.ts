interface MindMapMeasurementCaches {
  measureRichtextNodeTextSizeEl?: HTMLElement | null;
  measureCustomNodeContentSizeEl?: HTMLElement | null;
}

interface MindMapMeasurementTarget {
  commonCaches?: MindMapMeasurementCaches;
  render?: (callback?: (() => void) | null, source?: string) => void;
  reRender?: (callback?: (() => void) | null, source?: string) => void;
  on?: (event: string, callback: () => void) => void;
}

const registeredMaps = new WeakSet<object>();
const hosts = new WeakMap<object, HTMLElement>();
const repairScheduled = new WeakSet<object>();
const fontRepairsRegistered = new WeakSet<object>();
const completedFirstRender = new WeakSet<object>();
const pendingFontRepair = new WeakSet<object>();

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
    // The upstream cache is created as `position:fixed; left:-999999px`.
    // Keeping that extreme viewport coordinate after relocation makes Chrome
    // give nested rich-text blocks an artificially small shrink-to-fit width.
    // The host is already safely off-screen, so measure at a normal local
    // coordinate and let the cache width follow its content.
    Object.assign(element.style, {
      position: 'relative',
      left: '0px',
      top: '0px',
      width: 'max-content',
      height: 'auto',
    });
    if (element.parentElement !== host) {
      host.appendChild(element);
      moved = true;
    }
  });
  return moved;
}

function requestFullGeometryRepair(map: MindMapMeasurementTarget, source: string): void {
  if (typeof map.reRender === 'function') {
    map.reRender(null, source);
    return;
  }
  map.render?.(null, 'changeTheme');
}

function scheduleFullGeometryRepair(
  map: MindMapMeasurementTarget,
  source = 'yemind-measurement-host',
): void {
  const key = map as object;
  if (repairScheduled.has(key)) return;
  repairScheduled.add(key);
  const run = (): void => {
    repairScheduled.delete(key);
    requestFullGeometryRepair(map, source);
  };
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(run);
  } else {
    queueMicrotask(run);
  }
}

function repairAfterFontsReady(map: MindMapMeasurementTarget, editorRoot: HTMLElement): void {
  const key = map as object;
  if (fontRepairsRegistered.has(key)) return;
  const ready = typeof document !== 'undefined' ? document.fonts?.ready : undefined;
  if (!ready || typeof ready.then !== 'function') return;
  fontRepairsRegistered.add(key);
  void ready.then(() => {
    if (!registeredMaps.has(key) || typeof document === 'undefined') return;
    if (!completedFirstRender.has(key)) {
      pendingFontRepair.add(key);
      return;
    }
    const context = editorRoot.closest<HTMLElement>('.ymz-editor') ?? editorRoot;
    moveMeasurementElements(map, getHost(map, context));
    scheduleFullGeometryRepair(map, 'yemind-fonts-ready');
  });
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
  const key = map as object;
  const context = editorRoot.closest<HTMLElement>('.ymz-editor') ?? editorRoot;
  const relocate = (): boolean => {
    const moved = moveMeasurementElements(map, getHost(map, context));
    if (moved) scheduleFullGeometryRepair(map);
    return moved;
  };

  const moved = relocate();
  if (!registeredMaps.has(key)) {
    registeredMaps.add(key);
    repairAfterFontsReady(map, context);
    map.on?.('node_tree_render_end', () => {
      completedFirstRender.add(key);
      const fontRepair = pendingFontRepair.delete(key);
      const cachesMoved = moveMeasurementElements(map, getHost(map, context));
      if (fontRepair) scheduleFullGeometryRepair(map, 'yemind-fonts-ready');
      else if (cachesMoved) scheduleFullGeometryRepair(map);
    });
    map.on?.('beforeDestroy', () => {
      registeredMaps.delete(key);
      fontRepairsRegistered.delete(key);
      repairScheduled.delete(key);
      completedFirstRender.delete(key);
      pendingFontRepair.delete(key);
      hosts.get(key)?.remove();
      hosts.delete(key);
    });
    queueMicrotask(relocate);
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(relocate);
    }
  }
  return moved;
}
