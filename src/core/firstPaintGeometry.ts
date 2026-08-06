export interface FontFacesLike {
  status?: string;
  ready?: Promise<unknown>;
}

/**
 * Re-measure every node once the fonts the map is actually rendered with have
 * finished loading.
 *
 * Node geometry is measured from the DOM at render time. A map that paints
 * before its host's webfonts resolve is measured with fallback metrics, and
 * every node keeps that wrong size until something else re-measures it — which,
 * in practice, was opening and closing an editor on each node one at a time.
 * Wider fallback metrics make every node too big, which is exactly the reported
 * symptom.
 *
 * `changeTheme` is the render source upstream treats as "geometry is stale":
 * `Base#checkIsNeedResizeSources()` gates the per-node `getSize()` on it, so it
 * is the one source that re-measures text rather than only re-laying out cached
 * sizes.
 *
 * Returns a cancel function; nothing runs if the fonts already resolved before
 * the map was built, which is the normal case for a warm start.
 */
export function remeasureWhenFontsReady(
  mindMap: any,
  fonts: FontFacesLike | null | undefined = typeof document === 'undefined' ? null : document.fonts,
): () => void {
  let cancelled = false;
  const ready = fonts?.ready;
  if (!ready || typeof ready.then !== 'function' || fonts?.status === 'loaded') {
    return () => { cancelled = true; };
  }
  void ready.then(() => {
    if (cancelled) return;
    // Never re-measure under an open editor: that transaction owns the node's
    // geometry until it commits.
    if (mindMap?.richText?.showTextEdit === true) return;
    mindMap?.render?.(null, 'changeTheme');
  });
  return () => { cancelled = true; };
}
