export interface RectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface SizeLike {
  width: number;
  height: number;
}

export interface AnchoredPlacementInput {
  viewport: RectLike;
  anchor: RectLike;
  dialog: SizeLike;
  gap?: number;
  margin?: number;
}

export interface AnchoredPlacementResult extends SizeLike {
  left: number;
  top: number;
  placement: string;
  candidateCount: number;
  overlapsAnchor: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function overlapArea(a: RectLike, b: RectLike): number {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return width * height;
}

function rect(left: number, top: number, width: number, height: number): RectLike {
  return { left, top, right: left + width, bottom: top + height, width, height };
}

export function computeAssetDialogPlacement(input: AnchoredPlacementInput): AnchoredPlacementResult {
  const gap = Math.max(0, input.gap ?? 14);
  const margin = Math.max(0, input.margin ?? 12);
  const viewport = input.viewport;
  const anchor = input.anchor;
  const width = Math.min(Math.max(1, input.dialog.width), Math.max(1, viewport.width - margin * 2));
  const height = Math.min(Math.max(1, input.dialog.height), Math.max(1, viewport.height - margin * 2));
  const minLeft = viewport.left + margin;
  const minTop = viewport.top + margin;
  const maxLeft = Math.max(minLeft, viewport.right - margin - width);
  const maxTop = Math.max(minTop, viewport.bottom - margin - height);
  const centerLeft = anchor.left + (anchor.width - width) / 2;
  const centerTop = anchor.top + (anchor.height - height) / 2;
  const candidates = [
    { placement: 'right', left: anchor.right + gap, top: centerTop },
    { placement: 'left', left: anchor.left - gap - width, top: centerTop },
    { placement: 'bottom', left: centerLeft, top: anchor.bottom + gap },
    { placement: 'top', left: centerLeft, top: anchor.top - gap - height },
    { placement: 'right-bottom', left: anchor.right + gap, top: anchor.bottom + gap },
    { placement: 'right-top', left: anchor.right + gap, top: anchor.top - gap - height },
    { placement: 'left-bottom', left: anchor.left - gap - width, top: anchor.bottom + gap },
    { placement: 'left-top', left: anchor.left - gap - width, top: anchor.top - gap - height },
  ];

  const scored = candidates.map((candidate, index) => {
    const left = clamp(candidate.left, minLeft, maxLeft);
    const top = clamp(candidate.top, minTop, maxTop);
    const placed = rect(left, top, width, height);
    const overlap = overlapArea(placed, anchor);
    const displacement = Math.abs(left - candidate.left) + Math.abs(top - candidate.top);
    const score = overlap * 1_000_000 + displacement * 10 + index;
    return { ...candidate, left, top, overlap, score };
  }).sort((a, b) => a.score - b.score);
  const best = scored[0];
  return {
    left: best.left,
    top: best.top,
    width,
    height,
    placement: best.placement,
    candidateCount: candidates.length,
    overlapsAnchor: best.overlap > 0,
  };
}
