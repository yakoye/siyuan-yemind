import Quill from "quill";
import {
  deleteCodeBlock,
  findCurrentCodeBlock,
  removeCodeBlockFormat,
  replaceCodeBlock,
  type CodeBlockSnapshot,
} from "./codeBlock";
import {
  registerYeMindFormats,
  YEMIND_RICH_TEXT_FORMATS,
} from "./YeMindRichText";
import type { RichTextFormattingTarget } from "./richTextTarget";
import type { RichTextSelectionRect } from "./RichTextToolbar";
import { editableTextLength } from "./textEditingPolicy";

export type OutlineFocusPlacement = "start" | "end" | "select-all" | "range";

export interface OutlineFocusRequest {
  placement: OutlineFocusPlacement;
  start?: number;
  end?: number;
}

export interface OutlineSelectionState {
  text: string;
  length: number;
  start: number;
  end: number;
}

export interface OutlineRichTextControllerOptions {
  root: HTMLElement;
  isReadonly: () => boolean;
  onCommit: (uid: string, html: string) => boolean;
  onDiagnostic?: (action: string, details?: Record<string, unknown>) => void;
  onSelectionChange: (
    hasRange: boolean,
    rect: RichTextSelectionRect | null,
    format: Record<string, unknown> | null,
    target: RichTextFormattingTarget,
  ) => void;
}

function decodeOriginal(host: HTMLElement): string {
  try {
    return decodeURIComponent(host.dataset.outlineOriginal ?? "");
  } catch {
    return host.innerHTML;
  }
}

function normalizeHtml(html: string): string {
  return html === "<p><br></p>" ? "" : html;
}

/**
 * A single active Quill instance is reused conceptually across outline rows.
 * Inactive rows remain lightweight HTML; structure changes still go through
 * simple-mind-map commands owned by YeMindEditor.
 */
export class OutlineRichTextController implements RichTextFormattingTarget {
  private quill: Quill | null = null;
  private host: HTMLElement | null = null;
  private uid = "";
  private originalHtml = "";
  private sessionStartHtml = "";
  private range: any = null;
  private lastRange: any = null;
  private commitTimer: number | null = null;
  private composing = false;
  private committing = false;

  private readonly onEditorKeyDown = (event: KeyboardEvent): void => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== "a" || !this.quill) return;
    event.preventDefault();
    event.stopPropagation();
    const length = editableTextLength(this.quill);
    this.quill.setSelection(0, length, Quill.sources.USER);
    this.range = { index: 0, length };
    this.options.onDiagnostic?.("select-all-shortcut", { length });
  };

  constructor(private readonly options: OutlineRichTextControllerOptions) {
    registerYeMindFormats();
  }

  get activeHost(): HTMLElement | null {
    return this.host;
  }

  get isComposing(): boolean {
    return this.composing;
  }

  activate(
    host: HTMLElement,
    uid: string,
    request?: OutlineFocusRequest,
  ): void {
    if (this.host === host && this.quill) {
      if (request) this.focus(request);
      return;
    }
    this.detach(true);
    this.host = host;
    this.uid = uid;
    this.options.onDiagnostic?.("edit-start", { uidLength: uid.length });
    this.originalHtml = decodeOriginal(host);
    host.classList.add("is-editing");
    host.innerHTML = this.originalHtml;
    this.quill = new Quill(host, {
      modules: { toolbar: false },
      formats: [...YEMIND_RICH_TEXT_FORMATS],
      readOnly: this.options.isReadonly(),
    });
    this.quill.root.setAttribute("spellcheck", "false");
    // Quill canonicalizes tags (for example <b> to <strong>). Treat that
    // canonical initial value as unchanged so merely focusing a row does not
    // convert a plain node into rich text.
    this.originalHtml = normalizeHtml(this.quill.root.innerHTML);
    this.sessionStartHtml = this.originalHtml;
    host.dataset.outlineOriginal = encodeURIComponent(this.originalHtml);
    this.quill.root.addEventListener("keydown", this.onEditorKeyDown, true);
    this.quill.root.addEventListener(
      "compositionstart",
      this.onCompositionStart,
    );
    this.quill.root.addEventListener("compositionend", this.onCompositionEnd);
    this.quill.on("selection-change", this.onSelectionChange);
    this.quill.on("text-change", this.onTextChange);
    this.focus(request);
  }

  setReadonly(readonly: boolean): void {
    this.quill?.enable(!readonly);
  }

  focus(request: OutlineFocusRequest = { placement: "end" }): void {
    if (!this.quill) return;
    window.requestAnimationFrame(() => {
      if (!this.quill) return;
      this.quill.root.focus({ preventScroll: true });
      const length = Math.max(0, this.quill.getLength() - 1);
      let start = length;
      let end = length;
      if (request.placement === "start") start = end = 0;
      else if (request.placement === "select-all") {
        start = 0;
        end = length;
      } else if (request.placement === "range") {
        start = Math.min(length, Math.max(0, request.start ?? 0));
        end = Math.min(length, Math.max(start, request.end ?? start));
      }
      this.quill.setSelection(start, end - start, Quill.sources.SILENT);
      this.range = { index: start, length: end - start };
      const scrollIntoView = this.host?.scrollIntoView;
      if (typeof scrollIntoView === "function")
        scrollIntoView.call(this.host, { block: "nearest" });
    });
  }

  getSelectionState(host = this.host): OutlineSelectionState {
    if (!host) return { text: "", length: 0, start: 0, end: 0 };
    if (host === this.host && this.quill) {
      const text = this.plainText();
      const current = this.quill.getSelection() ??
        this.range ??
        this.lastRange ?? { index: 0, length: 0 };
      return {
        text,
        length: text.length,
        start: Math.min(text.length, Math.max(0, Number(current.index ?? 0))),
        end: Math.min(
          text.length,
          Math.max(0, Number(current.index ?? 0) + Number(current.length ?? 0)),
        ),
      };
    }
    const text = host.textContent?.replace(/\u00a0/g, " ").trim() ?? "";
    return { text, length: text.length, start: 0, end: 0 };
  }

  flush(host = this.host): boolean {
    if (
      !host ||
      host !== this.host ||
      !this.quill ||
      !this.uid ||
      this.committing
    )
      return false;
    if (this.commitTimer !== null) {
      window.clearTimeout(this.commitTimer);
      this.commitTimer = null;
    }
    const html = normalizeHtml(this.quill.root.innerHTML);
    const text = this.plainText();
    if (html === this.originalHtml) return false;
    this.committing = true;
    try {
      const changed = this.options.onCommit(this.uid, html);
      this.options.onDiagnostic?.("commit", {
        changed,
        textLength: text.length,
        htmlLength: html.length,
      });
      if (changed) {
        this.originalHtml = html;
        host.dataset.outlineOriginal = encodeURIComponent(html);
        host.dataset.outlineRichText = "true";
      }
      return changed;
    } finally {
      this.committing = false;
    }
  }

  commitAndDetach(reason: string): void {
    if (!this.host) return;
    this.flush();
    this.detach(false, reason);
  }

  /** Detach an editor whose backing node is about to be removed. */
  discardAndDetach(reason: string): void {
    this.detach(false, reason);
  }

  cancel(): void {
    if (!this.host) return;
    if (this.commitTimer !== null) window.clearTimeout(this.commitTimer);
    this.commitTimer = null;
    const host = this.host;
    const uid = this.uid;
    const original = this.sessionStartHtml;
    const current = this.quill
      ? normalizeHtml(this.quill.root.innerHTML)
      : this.originalHtml;
    this.detach(false);
    this.options.onDiagnostic?.("cancel", { changed: current !== original });
    if (uid && current !== original) this.options.onCommit(uid, original);
    host.innerHTML = original;
    host.dataset.outlineOriginal = encodeURIComponent(original);
  }

  detach(commit: boolean, reason = commit ? "commit" : "detach"): void {
    if (!this.host) return;
    if (commit) this.flush();
    if (this.commitTimer !== null) window.clearTimeout(this.commitTimer);
    this.commitTimer = null;
    const host = this.host;
    const html = this.quill
      ? normalizeHtml(this.quill.root.innerHTML)
      : this.originalHtml;
    if (this.quill) {
      this.quill.root.removeEventListener("keydown", this.onEditorKeyDown, true);
      this.quill.root.removeEventListener(
        "compositionstart",
        this.onCompositionStart,
      );
      this.quill.root.removeEventListener(
        "compositionend",
        this.onCompositionEnd,
      );
      this.quill.off("selection-change", this.onSelectionChange);
      this.quill.off("text-change", this.onTextChange);
    }
    host.classList.remove("is-editing");
    this.options.onDiagnostic?.("editor-destroy", { commit, reason });
    host.innerHTML = html;
    this.options.onSelectionChange(false, null, null, this);
    this.quill = null;
    this.host = null;
    this.uid = "";
    this.sessionStartHtml = "";
    this.range = null;
    this.lastRange = null;
  }

  destroy(): void {
    this.detach(true);
  }

  getSelectedText(): string {
    const range = this.activeRange();
    if (!this.quill || !range) return "";
    return String(this.quill.getText(range.index, range.length) ?? "").trim();
  }

  getSelectedInlineLink(): string {
    const range = this.activeRange();
    if (!this.quill || !range) return "";
    const value = this.quill.getFormat(range.index, range.length)?.link;
    return typeof value === "string" ? value : "";
  }

  setInlineLink(link: string | null): void {
    this.formatText({ link: link || false });
  }

  toggleInlineCode(): void {
    const range = this.activeRange();
    if (!this.quill || !range || !range.length) return;
    const current = Boolean(
      this.quill.getFormat(range.index, range.length)?.code,
    );
    this.formatText({ code: !current });
  }

  getCodeBlock(): CodeBlockSnapshot | null {
    const range = this.activeRange();
    return this.quill ? findCurrentCodeBlock(this.quill, range) : null;
  }

  saveCodeBlock(code: string, language = "plain"): void {
    const range = this.activeRange();
    if (!this.quill || !range) return;
    const existing = findCurrentCodeBlock(this.quill, range);
    replaceCodeBlock(this.quill, existing ?? range, code, language);
    this.restoreRange(range);
  }

  removeCodeBlockFormat(): void {
    const range = this.activeRange();
    const block = this.quill ? findCurrentCodeBlock(this.quill, range) : null;
    if (this.quill && block) removeCodeBlockFormat(this.quill, block);
  }

  deleteCodeBlock(): void {
    const range = this.activeRange();
    const block = this.quill ? findCurrentCodeBlock(this.quill, range) : null;
    if (this.quill && block) deleteCodeBlock(this.quill, block);
  }

  insertFormula(formula: string, mode: "inline" | "block" = "inline"): void {
    const range = this.activeRange();
    if (!this.quill || !range) return;
    const value = mode === "block" ? `\\displaystyle{${formula}}` : formula;
    if (range.length > 0)
      this.quill.deleteText(range.index, range.length, Quill.sources.USER);
    if (mode === "block") {
      this.quill.insertText(range.index, "\n", Quill.sources.USER);
      this.quill.insertEmbed(
        range.index + 1,
        "formula",
        value,
        Quill.sources.USER,
      );
      this.quill.insertText(range.index + 2, "\n", Quill.sources.USER);
      this.restoreRange({ index: range.index + 3, length: 0 });
    } else {
      this.quill.insertEmbed(range.index, "formula", value, Quill.sources.USER);
      this.restoreRange({ index: range.index + 1, length: 0 });
    }
  }

  formatText(config: Record<string, unknown>): void {
    const range = this.activeRange();
    if (!this.quill || !range || !range.length || this.options.isReadonly())
      return;
    this.quill.formatText(
      range.index,
      range.length,
      config,
      Quill.sources.USER,
    );
    this.restoreRange(range);
  }

  clearTextFormat(): void {
    const range = this.activeRange();
    if (!this.quill || !range || !range.length || this.options.isReadonly())
      return;
    this.quill.removeFormat(range.index, range.length, Quill.sources.USER);
    this.restoreRange(range);
  }

  setCloze(enabled: boolean): void {
    this.formatText(
      enabled
        ? { background: "#f5dfa0", color: "transparent" }
        : { background: false, color: false },
    );
  }

  private activeRange(): any | null {
    return this.quill?.getSelection() ?? this.range ?? this.lastRange ?? null;
  }

  private plainText(): string {
    if (!this.quill) return "";
    return String(
      this.quill.getText(0, Math.max(0, this.quill.getLength() - 1)) ?? "",
    ).replace(/\u00a0/g, " ");
  }

  restoreSelection(): void {
    const range = this.activeRange();
    if (range) this.restoreRange(range);
  }

  private restoreRange(range: any): void {
    this.range = { index: range.index, length: range.length };
    this.quill?.setSelection(range.index, range.length, Quill.sources.SILENT);
  }

  private scheduleCommit(): void {
    if (this.commitTimer !== null) window.clearTimeout(this.commitTimer);
    this.commitTimer = window.setTimeout(() => {
      this.commitTimer = null;
      this.flush();
    }, 160);
  }

  private readonly onCompositionStart = (): void => {
    this.composing = true;
    this.options.onDiagnostic?.("composition-start");
  };

  private readonly onCompositionEnd = (): void => {
    this.composing = false;
    this.options.onDiagnostic?.("composition-end");
    this.scheduleCommit();
  };

  private readonly onTextChange = (): void => {
    this.options.onDiagnostic?.("text-change", {
      composing: this.composing,
      textLength: this.plainText().length,
    });
    if (!this.composing) this.scheduleCommit();
  };

  private readonly onSelectionChange = (range: any): void => {
    this.lastRange = this.range;
    this.range = range;
    if (!range || !this.quill || !this.host) {
      this.options.onSelectionChange(false, null, null, this);
      return;
    }
    const bounds = this.quill.getBounds(range.index, range.length) ?? {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
      width: 0,
    };
    const rect = this.quill.root.getBoundingClientRect();
    const rectInfo = {
      left: bounds.left + rect.left,
      top: bounds.top + rect.top,
      right: bounds.right + rect.left,
      bottom: bounds.bottom + rect.top,
      width: bounds.width,
    };
    const hasRange = range.length > 0;
    const format = this.quill.getFormat(range.index, range.length) as Record<
      string,
      unknown
    >;
    this.options.onSelectionChange(hasRange, rectInfo, format, this);
  };
}
