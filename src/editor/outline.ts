import type { MindMapTree } from "../model/types";
import { sanitizeRichHtml } from "../content/sanitizeRichHtml";

export interface OutlineRow {
  uid: string;
  text: string;
  html: string;
  richText: boolean;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  isRoot: boolean;
}

export type OutlineKeyAction =
  | "none"
  | "hard-break"
  | "insert-sibling"
  | "insert-child"
  | "indent"
  | "outdent"
  | "delete-empty"
  | "previous"
  | "next"
  | "collapse"
  | "expand"
  | "cancel";

export interface OutlineKeyContext {
  key: string;
  empty: boolean;
  isRoot: boolean;
  readonly: boolean;
  hasChildren?: boolean;
  expanded?: boolean;
  atStart?: boolean;
  atEnd?: boolean;
  composing?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

const NO_COLLAPSED_OUTLINE_UIDS: ReadonlySet<string> = new Set<string>();

function plainTextFromHtml(value: string): string {
  const element = document.createElement("div");
  element.innerHTML = value;
  return (element.textContent ?? "").replace(/\u00a0/g, " ").trim();
}

function nodeText(tree: MindMapTree): {
  text: string;
  html: string;
  richText: boolean;
} {
  const value = String(tree.data.text ?? "");
  if (tree.data.richText) {
    return {
      text: plainTextFromHtml(value),
      html: sanitizeOutlineHtml(value),
      richText: true,
    };
  }
  return {
    text: value,
    html: escapeHtml(value).replaceAll("\n", "<br>"),
    richText: false,
  };
}

/**
 * Build the outline from the complete map tree. Outline disclosure is editor UI
 * state and deliberately does not inherit `node.data.expand`, which belongs to
 * the canvas renderer.
 */
export function flattenOutline(
  tree: MindMapTree,
  collapsedUids: ReadonlySet<string> = NO_COLLAPSED_OUTLINE_UIDS,
): OutlineRow[] {
  const rows: OutlineRow[] = [];
  const visit = (node: MindMapTree, depth: number, path: string): void => {
    const children = Array.isArray(node.children) ? node.children : [];
    const hasChildren = children.length > 0;
    const uid = String(node.data.uid ?? path);
    const expanded = !collapsedUids.has(uid);
    rows.push({
      uid,
      ...nodeText(node),
      depth,
      hasChildren,
      expanded,
      isRoot: depth === 0,
    });
    if (hasChildren && expanded) {
      children.forEach((child, index) =>
        visit(child, depth + 1, `${path}.${index}`),
      );
    }
  };
  visit(tree, 0, "root");
  return rows;
}

/** Remove disclosure entries whose node disappeared or no longer has children. */
export function pruneOutlineCollapsedUids(
  tree: MindMapTree,
  collapsedUids: Set<string>,
): void {
  const collapsible = new Set<string>();
  const visit = (node: MindMapTree, path: string): void => {
    const children = Array.isArray(node.children) ? node.children : [];
    const uid = String(node.data.uid ?? path);
    if (children.length > 0) collapsible.add(uid);
    children.forEach((child, index) => visit(child, `${path}.${index}`));
  };
  visit(tree, "root");
  collapsedUids.forEach((uid) => {
    if (!collapsible.has(uid)) collapsedUids.delete(uid);
  });
}

export function resolveOutlineKeyAction(
  context: OutlineKeyContext,
): OutlineKeyAction {
  if (context.composing) return "none";
  if (context.key === "ArrowUp") return context.atStart ? "previous" : "none";
  if (context.key === "ArrowDown") return context.atEnd ? "next" : "none";
  if (context.key === "Escape") return "cancel";
  if (context.readonly) return "none";
  const hasCommandModifier = Boolean(
    context.altKey || context.ctrlKey || context.metaKey,
  );
  if (
    (context.key === "Backspace" || context.key === "Delete") &&
    context.empty &&
    !context.isRoot &&
    !context.shiftKey &&
    !hasCommandModifier
  ) {
    return "delete-empty";
  }
  if (context.key === "Enter") {
    if (context.shiftKey && !hasCommandModifier) return "hard-break";
    if (context.shiftKey || hasCommandModifier) return "none";
    return context.isRoot ? "insert-child" : "insert-sibling";
  }
  if (context.key === "Tab" && !hasCommandModifier)
    return context.shiftKey ? "outdent" : "indent";
  if (
    context.key === "ArrowLeft" &&
    context.atStart &&
    context.hasChildren &&
    context.expanded
  )
    return "collapse";
  if (
    context.key === "ArrowRight" &&
    context.atEnd &&
    context.hasChildren &&
    context.expanded === false
  )
    return "expand";
  return "none";
}

function rowHtml(row: OutlineRow, readonly: boolean): string {
  const tabindex = readonly ? "-1" : "0";
  const branch = row.expanded ? "▾" : "▸";
  const label = row.text || "空节点";
  const encodedOriginal = encodeURIComponent(row.html);
  const toggle = row.hasChildren
    ? `<button type="button" class="ymz-outline-row__branch" data-outline-toggle aria-label="${row.expanded ? "折叠" : "展开"}">${branch}</button>`
    : '<span class="ymz-outline-row__branch ymz-outline-row__branch--placeholder" aria-hidden="true"></span>';
  return `<div class="ymz-outline-row" role="treeitem" aria-level="${row.depth + 1}" aria-expanded="${row.hasChildren ? row.expanded : "false"}" data-outline-uid="${escapeHtml(row.uid)}" data-outline-root="${row.isRoot}" data-outline-has-children="${row.hasChildren}" data-outline-expanded="${row.expanded}" data-outline-drag-source="${readonly || row.isRoot ? "false" : "true"}" style="--ymz-outline-depth:${row.depth}">${toggle}<div class="ymz-outline-row__editor" data-outline-editor data-outline-original="${escapeHtml(encodedOriginal)}" data-outline-rich-text="${row.richText}" data-placeholder="空节点" aria-label="编辑节点：${escapeHtml(label)}" tabindex="${tabindex}"${readonly ? ' aria-readonly="true"' : ""}>${row.html}</div></div>`;
}

export function renderOutlineHtml(
  tree: MindMapTree,
  readonly = false,
  collapsedUids: ReadonlySet<string> = NO_COLLAPSED_OUTLINE_UIDS,
): string {
  return flattenOutline(tree, collapsedUids)
    .map((row) => rowHtml(row, readonly))
    .join("");
}

export function resolveOutlineToggleState(input: {
  hasChildren: boolean;
  expanded: boolean;
}): boolean | null {
  return input.hasChildren ? !input.expanded : null;
}

/**
 * A signature of structural and outline-disclosure state only. Text and rich
 * formatting are deliberately excluded so ordinary typing never tears down the
 * active editor session.
 */
export function outlineStructureSignature(
  tree: MindMapTree,
  collapsedUids: ReadonlySet<string> = NO_COLLAPSED_OUTLINE_UIDS,
): string {
  return flattenOutline(tree, collapsedUids)
    .map(
      (row) =>
        `${row.uid}:${row.depth}:${row.hasChildren ? 1 : 0}:${row.expanded ? 1 : 0}`,
    )
    .join("|");
}

/**
 * Patch outline rows by stable UID. Existing rows that are already in the correct
 * order are not reinserted: moving an active contenteditable node through a
 * DocumentFragment makes browsers drop focus and selection.
 */
export function patchOutlineTree(
  container: HTMLElement,
  tree: MindMapTree,
  readonly = false,
  activeUid: string | null = null,
  collapsedUids: ReadonlySet<string> = NO_COLLAPSED_OUTLINE_UIDS,
): void {
  const rows = flattenOutline(tree, collapsedUids);
  const existing = new Map<string, HTMLElement>();
  container
    .querySelectorAll<HTMLElement>(":scope > [data-outline-uid]")
    .forEach((row) => {
      existing.set(row.dataset.outlineUid ?? "", row);
    });
  const keep = new Set<string>();
  const desired: HTMLElement[] = [];

  rows.forEach((data) => {
    keep.add(data.uid);
    let row = existing.get(data.uid);
    if (!row) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = rowHtml(data, readonly);
      row = wrapper.firstElementChild as HTMLElement;
    } else {
      row.setAttribute("aria-level", String(data.depth + 1));
      row.setAttribute(
        "aria-expanded",
        data.hasChildren ? String(data.expanded) : "false",
      );
      row.dataset.outlineRoot = String(data.isRoot);
      row.dataset.outlineHasChildren = String(data.hasChildren);
      row.dataset.outlineExpanded = String(data.expanded);
      row.dataset.outlineDragSource = String(!readonly && !data.isRoot);
      row.style.setProperty("--ymz-outline-depth", String(data.depth));

      const existingToggle = row.querySelector<HTMLElement>(
        "[data-outline-toggle]",
      );
      if (data.hasChildren) {
        let toggle = existingToggle as HTMLButtonElement | null;
        if (!toggle) {
          const placeholder = row.querySelector<HTMLElement>(
            ".ymz-outline-row__branch--placeholder",
          );
          toggle = document.createElement("button");
          toggle.type = "button";
          toggle.className = "ymz-outline-row__branch";
          toggle.dataset.outlineToggle = "";
          placeholder?.replaceWith(toggle);
        }
        toggle.textContent = data.expanded ? "▾" : "▸";
        toggle.setAttribute("aria-label", data.expanded ? "折叠" : "展开");
      } else if (existingToggle) {
        const placeholder = document.createElement("span");
        placeholder.className =
          "ymz-outline-row__branch ymz-outline-row__branch--placeholder";
        placeholder.setAttribute("aria-hidden", "true");
        existingToggle.replaceWith(placeholder);
      }

      const editor = row.querySelector<HTMLElement>("[data-outline-editor]");
      if (editor) {
        editor.tabIndex = readonly ? -1 : 0;
        if (readonly) editor.setAttribute("aria-readonly", "true");
        else editor.removeAttribute("aria-readonly");
        if (data.uid !== activeUid) {
          editor.innerHTML = data.html;
          editor.dataset.outlineOriginal = encodeURIComponent(data.html);
          editor.dataset.outlineRichText = String(data.richText);
          editor.setAttribute(
            "aria-label",
            `编辑节点：${data.text || "空节点"}`,
          );
        }
      }
    }
    desired.push(row);
  });

  existing.forEach((row, uid) => {
    if (!keep.has(uid)) row.remove();
  });

  let cursor: Element | null = container.firstElementChild;
  desired.forEach((row) => {
    if (row === cursor) {
      cursor = cursor.nextElementSibling;
      return;
    }
    container.insertBefore(row, cursor);
  });
}

/** Allow the Quill subset emitted by YeMind while removing executable markup. */
export function sanitizeOutlineHtml(value: string): string {
  return sanitizeRichHtml(value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
