import { clamp, type TreeDropKind } from "../core/treeDropIntent";

export type OutlineDropPosition = "before" | "inside" | "after";

export interface OutlineDropIntentInput {
  sourceUid: string;
  targetUid: string;
  clientY: number;
  rect: { top: number; height: number };
}

export interface OutlineDropIntent {
  targetUid: string;
  position: OutlineDropPosition;
}

export interface OutlineDragStartInput {
  interactive: boolean;
  fromEditor: boolean;
  editing?: boolean;
  elapsedMs: number;
  distancePx: number;
}

export interface OutlineAncestor {
  uid: string;
  depth: number;
}

export interface OutlinePointerDropIntentInput extends OutlineDropIntentInput {
  clientX: number;
  targetTextLeft: number;
  targetDepth: number;
  indentWidth: number;
  targetAncestors: OutlineAncestor[];
}

export interface OutlinePointerDropIntent extends OutlineDropIntent {
  desiredDepth: number;
  kind: Exclude<TreeDropKind, "none">;
}

const OUTLINE_ROW_SPLIT_RATIO = 0.5;

export function isOutlinePointerInDragZone(input: { clientX: number; textLeft: number; tolerance?: number }): boolean {
  const tolerance = Math.max(0, input.tolerance ?? 0);
  return input.clientX < input.textLeft - tolerance;
}

function outlineVerticalSlot(input: OutlineDropIntentInput): "before" | "after" | null {
  if (
    !input.sourceUid ||
    !input.targetUid ||
    input.sourceUid === input.targetUid ||
    input.rect.height <= 0
  ) return null;
  // Once the pointer is associated with a row, its whole vertical hit area is
  // actionable. The upper half means BEFORE and the lower half means AFTER.
  // This deliberately removes the narrow edge-only zones that made the green
  // insertion guide blink while the pointer crossed ordinary row content.
  const offset = clamp(input.clientY - input.rect.top, 0, input.rect.height);
  return offset < input.rect.height * OUTLINE_ROW_SPLIT_RATIO ? "before" : "after";
}

export function resolveOutlineDropIntent(
  input: OutlineDropIntentInput,
): OutlineDropIntent | null {
  const position = outlineVerticalSlot(input);
  return position ? { targetUid: input.targetUid, position } : null;
}

/** Active rich-text/contenteditable surfaces always own text selection. */
export function isOutlineTextSelectionTarget(
  target: Element | null,
  activeEditor: HTMLElement | null,
): boolean {
  if (!target) return false;
  if (target.closest('.ql-editor,[contenteditable="true"]')) return true;
  return Boolean(
    activeEditor &&
      activeEditor.classList.contains('is-editing') &&
      activeEditor.contains(target),
  );
}

/** Structural dragging starts only from the dedicated gutter. */
export function shouldStartOutlinePointerDrag(
  input: OutlineDragStartInput,
): boolean {
  if (input.interactive || input.editing || input.fromEditor) return false;
  return input.distancePx >= 5;
}

/**
 * Resolve an explicit outline drop slot. Every locked row has a stable upper
 * and lower half. Horizontal movement snaps the insertion guide to a parent,
 * sibling or child depth. The controller adds hysteresis so small pointer
 * tremors do not make the guide jump between adjacent depth columns.
 */
export function resolveOutlinePointerDropIntent(
  input: OutlinePointerDropIntentInput,
): OutlinePointerDropIntent | null {
  if (!input.sourceUid || input.sourceUid === input.targetUid || input.rect.height <= 0) return null;

  const indent = Math.max(12, input.indentWidth || 0);
  const movedRight = input.clientX >= input.targetTextLeft + indent * 0.45;
  if (movedRight) {
    return {
      targetUid: input.targetUid,
      position: "inside",
      desiredDepth: input.targetDepth + 1,
      kind: "child",
    };
  }

  const vertical = outlineVerticalSlot(input);
  if (!vertical) return null;

  const baseTextLeft = input.targetTextLeft - input.targetDepth * indent;
  const rawDepth = Math.round((input.clientX - baseTextLeft) / indent);
  const desiredDepth = clamp(rawDepth, 1, Math.max(1, input.targetDepth));
  if (desiredDepth < input.targetDepth) {
    const ancestor = [...input.targetAncestors]
      .reverse()
      .find((item) => item.depth === desiredDepth);
    if (!ancestor) return null;
    return {
      targetUid: ancestor.uid,
      position: "after",
      desiredDepth,
      kind: "after",
    };
  }

  return {
    targetUid: input.targetUid,
    position: vertical,
    desiredDepth: input.targetDepth,
    kind: vertical,
  };
}
