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
}

export function resolveOutlineDropIntent(
  input: OutlineDropIntentInput,
): OutlineDropIntent | null {
  if (
    !input.sourceUid ||
    !input.targetUid ||
    input.sourceUid === input.targetUid ||
    input.rect.height <= 0
  )
    return null;
  const ratio = Math.max(
    0,
    Math.min(1, (input.clientY - input.rect.top) / input.rect.height),
  );
  const position: OutlineDropPosition =
    ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside";
  return { targetUid: input.targetUid, position };
}


/**
 * Active Quill/contenteditable surfaces own pointer selection completely.
 * Non-editing outline labels may still become row drags after the deliberate
 * long-press threshold.
 */
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

/**
 * Row chrome behaves like a conventional draggable row. The text editor keeps
 * normal text selection until a deliberate long press plus movement occurs.
 */
export function shouldStartOutlinePointerDrag(
  input: OutlineDragStartInput,
): boolean {
  if (input.interactive || input.editing) return false;
  if (input.distancePx < 6) return false;
  if (!input.fromEditor) return true;
  return input.elapsedMs >= 240;
}

/**
 * Resolve both the vertical insertion slot and the desired outline depth.
 * Horizontal movement to the right creates a child; moving left targets the
 * closest visible ancestor so the structure command never creates an invalid
 * intermediate depth.
 */
export function resolveOutlinePointerDropIntent(
  input: OutlinePointerDropIntentInput,
): OutlinePointerDropIntent | null {
  const vertical = resolveOutlineDropIntent(input);
  if (!vertical) return null;

  const indent = Math.max(12, input.indentWidth || 0);
  const ratio = Math.max(
    0,
    Math.min(1, (input.clientY - input.rect.top) / input.rect.height),
  );
  const movedRight = input.clientX >= input.targetTextLeft + indent * 0.6;
  const movedLeft = input.clientX <= input.targetTextLeft - indent * 0.6;
  const middle = ratio >= 0.25 && ratio <= 0.75;

  if (movedRight || (middle && !movedLeft) || input.targetDepth <= 0) {
    return {
      targetUid: input.targetUid,
      position: "inside",
      desiredDepth: input.targetDepth + 1,
    };
  }

  const depthDelta = Math.round(
    (input.clientX - input.targetTextLeft) / indent,
  );
  const desiredDepth = Math.max(
    1,
    Math.min(input.targetDepth, input.targetDepth + depthDelta),
  );
  const ancestor = [...input.targetAncestors]
    .reverse()
    .find((item) => item.depth === desiredDepth);

  return {
    targetUid: ancestor?.uid ?? input.targetUid,
    position: vertical.position === "inside" ? "after" : vertical.position,
    desiredDepth,
  };
}
