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
  isGeneralization?: boolean;
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

function plainTextFromHtml(value: string): string {
  const element = document.createElement("div");
  element.innerHTML = value;
  return (element.textContent ?? "").replace(/\u00a0/g, " ").trim();
}

function dataText(data: Record<string, unknown>): {
  text: string;
  html: string;
  richText: boolean;
} {
  const value = String(data.text ?? "");
  if (data.richText) {
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

/** Build the outline from the persisted node expand state. */
export function generalizationList(data: Record<string, unknown>): Record<string, unknown>[] {
  const value = data.generalization;
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  return value && typeof value === "object" ? [value as Record<string, unknown>] : [];
}

export function flattenOutline(tree: MindMapTree): OutlineRow[] {
  const rows: OutlineRow[] = [];
  const visit = (node: MindMapTree, depth: number, path: string): void => {
    const children = Array.isArray(node.children) ? node.children : [];
    const hasChildren = children.length > 0;
    const uid = String(node.data.uid ?? path);
    const expanded = node.data.expand !== false;
    rows.push({
      uid,
      ...dataText(node.data),
      depth,
      hasChildren,
      expanded,
      isRoot: depth === 0,
    });
    if (expanded) {
      if (hasChildren) children.forEach((child, index) => visit(child, depth + 1, `${path}.${index}`));
      generalizationList(node.data).forEach((summary, index) => {
        const summaryUid = String(summary.uid ?? `${uid}.summary.${index}`);
        rows.push({
          uid: summaryUid,
          ...dataText(summary),
          depth: depth + 1,
          hasChildren: false,
          expanded: true,
          isRoot: false,
          isGeneralization: true,
        });
      });
    }
  };
  visit(tree, 0, "root");
  return rows;
}

/** @deprecated Outline expansion is persisted in node data. */
export function pruneOutlineCollapsedUids(_tree: MindMapTree, collapsedUids: Set<string>): void {
  collapsedUids.clear();
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
  const leaf = !row.hasChildren && !row.isRoot && !row.isGeneralization;
  const toggle = row.hasChildren
    ? `<button type="button" class="ymz-outline-row__branch" data-outline-toggle aria-label="${row.expanded ? "折叠" : "展开"}">${branch}</button>`
    : `<span class="ymz-outline-row__branch ymz-outline-row__branch--placeholder" aria-hidden="true">${leaf ? '<span class="ymz-outline-row__leaf-dot"></span>' : ''}</span>`;
  return `<div class="ymz-outline-row" role="treeitem" aria-level="${row.depth + 1}" aria-expanded="${row.hasChildren ? row.expanded : "false"}" data-outline-uid="${escapeHtml(row.uid)}" data-outline-root="${row.isRoot}" data-outline-generalization="${Boolean(row.isGeneralization)}" data-outline-leaf="${leaf}" data-outline-has-children="${row.hasChildren}" data-outline-expanded="${row.expanded}" data-outline-drag-source="${readonly || row.isRoot || row.isGeneralization ? "false" : "true"}" style="--ymz-outline-depth:${row.depth}">${toggle}<div class="ymz-outline-row__editor" data-outline-editor data-outline-original="${escapeHtml(encodedOriginal)}" data-outline-rich-text="${row.richText}" data-placeholder="空节点" aria-label="编辑节点：${escapeHtml(label)}" tabindex="${tabindex}"${readonly ? ' aria-readonly="true"' : ""}>${row.html}</div></div>`;
}

export function renderOutlineHtml(
  tree: MindMapTree,
  readonly = false,
): string {
  return flattenOutline(tree)
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
): string {
  return flattenOutline(tree)
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
): void {
  const rows = flattenOutline(tree);
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
      row.dataset.outlineGeneralization = String(Boolean(data.isGeneralization));
      const leaf = !data.hasChildren && !data.isRoot && !data.isGeneralization;
      row.dataset.outlineLeaf = String(leaf);
      row.dataset.outlineHasChildren = String(data.hasChildren);
      row.dataset.outlineExpanded = String(data.expanded);
      row.dataset.outlineDragSource = String(!readonly && !data.isRoot && !data.isGeneralization);
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
        if (leaf) {
          const dot = document.createElement("span");
          dot.className = "ymz-outline-row__leaf-dot";
          placeholder.appendChild(dot);
        }
        existingToggle.replaceWith(placeholder);
      }

      const placeholder = row.querySelector<HTMLElement>(".ymz-outline-row__branch--placeholder");
      if (placeholder) {
        const dot = placeholder.querySelector<HTMLElement>(".ymz-outline-row__leaf-dot");
        if (leaf && !dot) {
          const nextDot = document.createElement("span");
          nextDot.className = "ymz-outline-row__leaf-dot";
          placeholder.appendChild(nextDot);
        } else if (!leaf && dot) dot.remove();
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
