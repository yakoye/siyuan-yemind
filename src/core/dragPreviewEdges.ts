export interface PreviewIncomingLineSnapshot {
  original: any;
  wasVisible: boolean;
  overlay: any;
}

export function dragLineIsVisible(line: any): boolean {
  if (!line) return false;
  if (typeof line.visible === 'function') {
    try {
      return Boolean(line.visible());
    } catch {
      return true;
    }
  }
  const display = line.node?.style?.display ?? line.attr?.('display');
  return display !== 'none';
}

/**
 * Room-making translates whole sibling subtrees. Their internal lines can use
 * the same SVG transform because both endpoints move together, but the line
 * from the stationary parent to a shifted subtree root needs one fixed and one
 * shifted endpoint. Re-render that edge on a temporary overlay instead of
 * hiding every affected parent branch during the drag preview.
 */
export function createShiftedIncomingLineOverlays(
  plugin: any,
  roots: any[],
  deltaY: number,
): PreviewIncomingLineSnapshot[] {
  const byParent = new Map<any, Set<any>>();
  (roots ?? []).forEach((root) => {
    const parent = root?.parent;
    if (!parent || !Array.isArray(parent.children)) return;
    const children = byParent.get(parent) ?? new Set<any>();
    children.add(root);
    byParent.set(parent, children);
  });

  const snapshots: PreviewIncomingLineSnapshot[] = [];
  byParent.forEach((shiftedChildren, parent) => {
    const lineDraw = parent?.lineDraw ?? plugin.mindMap?.lineDraw;
    const layout = parent?.renderer?.layout ?? plugin.mindMap?.renderer?.layout;
    if (!lineDraw?.path || !layout?.renderLine) return;

    const overlays = parent.children.map(() => lineDraw
      .path()
      .fill({ color: 'none' })
      .attr({ 'pointer-events': 'none' })
      .hide());
    const originalTops = new Map<any, number>();
    shiftedChildren.forEach((child) => {
      originalTops.set(child, Number(child.top) || 0);
      child.top = (Number(child.top) || 0) + deltaY;
    });

    try {
      layout.renderLine(
        parent,
        overlays,
        (...args: any[]) => parent.styleLine?.(...args),
        parent.style?.getStyle?.('lineStyle', true),
      );
    } finally {
      originalTops.forEach((top, child) => {
        child.top = top;
      });
    }

    parent.children.forEach((child: any, index: number) => {
      const overlay = overlays[index];
      if (!shiftedChildren.has(child)) {
        overlay?.remove?.();
        return;
      }
      const original = parent?._lines?.[index];
      if (!original || !overlay) {
        overlay?.remove?.();
        return;
      }
      const wasVisible = dragLineIsVisible(original);
      original.hide?.();
      overlay.attr?.({ 'pointer-events': 'none' });
      if (wasVisible) overlay.show?.();
      else overlay.hide?.();
      snapshots.push({ original, wasVisible, overlay });
    });
  });
  return snapshots;
}

export function restoreShiftedIncomingLineOverlays(
  snapshots: PreviewIncomingLineSnapshot[],
): void {
  (snapshots ?? []).forEach(({ original, wasVisible, overlay }) => {
    overlay?.remove?.();
    if (wasVisible) original?.show?.();
    else original?.hide?.();
  });
}
