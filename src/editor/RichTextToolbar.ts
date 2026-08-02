import { YEMIND_FONT_VALUES, YEMIND_SIZE_VALUES } from "./YeMindRichText";
import {
  isClozeFormat,
  nextToggleFormat,
  type RichTextBooleanFormat,
} from "./richTextActions";
import type { RichTextFormattingTarget } from "./richTextTarget";
import { parseEditableColor, presentColor } from "./colorPresentation";
import { colorPaletteInnerHtml } from "./colorPalette";

export interface CanvasSelectionSession {
  sessionId: number;
  uid: string;
  selectionEpoch: number;
}

export interface RichTextSelectionRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width?: number;
}

export interface RichTextToolbarCallbacks {
  onFormula?: (target: RichTextFormattingTarget) => void;
  onLink?: (target: RichTextFormattingTarget) => void;
  onCodeBlock?: (target: RichTextFormattingTarget) => void;
  onAction?: (action: string) => void;
}

type ColorKind = "color" | "background";

// Pointer selections keep changing for a short time after mouseup while the
// browser/Quill publishes the final Range. Only reveal the toolbar after that
// stream is quiet so it never chases the pointer or flashes at an old anchor.
const POINTER_SELECTION_SETTLE_MS = 120;

function option(value: string, label: string): string {
  return `<option value="${value.replaceAll("&", "&amp;").replaceAll('"', "&quot;")}">${label}</option>`;
}

function sizeOptions(): string {
  return YEMIND_SIZE_VALUES.map((value) =>
    option(value, value.replace("px", "")),
  ).join("");
}

function fontOptions(): string {
  const labels = ["无衬线", "衬线", "微软雅黑", "宋体", "等宽"];
  return YEMIND_FONT_VALUES.map((value, index) =>
    option(value, labels[index] ?? value),
  ).join("");
}

export class RichTextToolbar {
  private readonly element: HTMLElement;
  private readonly colorPopover: HTMLElement;
  private readonly customColorInput: HTMLInputElement;
  private formatInfo: Record<string, unknown> = {};
  private enabled = true;
  private interacting = false;
  private selecting = false;
  private pendingSelection: {
    hasRange: boolean;
    rectInfo: RichTextSelectionRect | null;
    formatInfo: Record<string, unknown> | null;
    target: RichTextFormattingTarget | null;
    session: CanvasSelectionSession | null;
  } | null = null;
  private target: RichTextFormattingTarget | null = null;
  private activeColorKind: ColorKind = "color";
  private colorSessionOriginal: string | false = false;
  private revealFrame = 0;
  private selectionSettleTimer = 0;
  private settlingPointerSelection = false;
  private visibilityEpoch = 0;
  private lastReportedRect: RichTextSelectionRect | null = null;
  private selectionSessionId = 0;
  private pointerSelectionMayPublish = false;
  private pointerSessionAtDown = 0;
  private readonly onDocumentMouseDown = (event: MouseEvent): void => {
    const node = event.target as Node;
    if (this.element.contains(node) || this.colorPopover.contains(node)) return;
    const targetElement = node instanceof Element ? node : node.parentElement;
    this.pointerSelectionMayPublish = Boolean(
      targetElement?.closest(
        '.ql-editor,[data-outline-editor],[data-role="outline-text-editor"],[contenteditable="true"]',
      ),
    );
    // Suppress stale selection notifications for the duration of any canvas
    // press. Only a press inside a live text editor is allowed to enter the
    // post-mouseup quiet period, because only that gesture can keep changing a
    // DOM Range while the pointer moves.
    this.selecting = this.root.contains(node) || this.pointerSelectionMayPublish;
    this.pointerSessionAtDown = this.selectionSessionId;
    this.cancelSelectionSettle();
    this.pendingSelection = null;
    this.hide();
  };
  private readonly onWindowMouseUp = (): void => {
    this.interacting = false;
    this.selecting = false;
    if (this.pointerSelectionMayPublish) {
      this.settlingPointerSelection = true;
      this.scheduleSettledPointerSelection();
      return;
    }
    this.pendingSelection = null;
    this.cancelSelectionSettle();
    this.pointerSelectionMayPublish = false;
  };

  constructor(
    private readonly root: HTMLElement,
    initialTarget: RichTextFormattingTarget,
    private readonly callbacks: RichTextToolbarCallbacks = {},
  ) {
    this.target = initialTarget;
    this.element = document.createElement("div");
    this.element.className = "ymz-rich-toolbar";
    this.element.hidden = true;
    this.element.style.visibility = "hidden";
    this.element.innerHTML = `
      <button type="button" data-rich-action="bold" title="加粗"><b>B</b></button>
      <button type="button" data-rich-action="italic" title="斜体"><i>I</i></button>
      <button type="button" data-rich-action="underline" title="下划线"><u>U</u></button>
      <button type="button" data-rich-action="strike" title="删除线"><s>S</s></button>
      <button type="button" data-rich-action="inline-code" title="行内代码">&lt;/&gt;</button>
      <button type="button" data-rich-action="code-block" title="代码块">代码块</button>
      <span class="ymz-rich-toolbar__separator"></span>
      <button type="button" class="ymz-rich-color" data-rich-action="color-menu" title="文字颜色"><span>A</span><i data-rich-swatch="color"></i></button>
      <button type="button" class="ymz-rich-color" data-rich-action="background-menu" title="背景颜色"><span>Bg</span><i data-rich-swatch="background"></i></button>
      <select data-rich-field="size" title="字号">
        <option value="">自动</option>${sizeOptions()}
      </select>
      <select data-rich-field="font" title="字体">
        <option value="">默认字体</option>${fontOptions()}
      </select>
      <span class="ymz-rich-toolbar__separator"></span>
      <button type="button" data-rich-action="link" title="行内链接">链接</button>
      <button type="button" data-rich-action="cloze" title="模糊/取消模糊">模糊</button>
      <button type="button" data-rich-action="formula" title="插入公式" aria-label="插入公式"><svg class="ymz-rich-toolbar__icon" data-yemind-formula-icon viewBox="0 0 24 24" aria-hidden="true"><path d="M18 4H6l6 8-6 8h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg></button>
      <button type="button" data-rich-action="clear" title="清除全部格式">清除</button>`;

    this.colorPopover = document.createElement("div");
    this.colorPopover.className = "ymz-color-popover";
    this.colorPopover.hidden = true;
    this.colorPopover.innerHTML = colorPaletteInnerHtml();
    this.customColorInput = document.createElement("input");
    this.customColorInput.type = "color";
    this.customColorInput.className = "ymz-color-popover__native";
    this.customColorInput.tabIndex = -1;
    this.customColorInput.setAttribute("aria-hidden", "true");
    this.colorPopover.appendChild(this.customColorInput);

    // Keep every editor overlay inside its own clipping/stacking context. This is
    // critical when SiYuan opens Settings or another host dialog above a tab.
    this.root.append(this.element, this.colorPopover);
    document.addEventListener("mousedown", this.onDocumentMouseDown, true);
    window.addEventListener("mouseup", this.onWindowMouseUp, true);
    this.bind();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.hide();
  }

  update(
    hasRange: boolean,
    rectInfo?: RichTextSelectionRect | null,
    formatInfo?: Record<string, unknown> | null,
    target?: RichTextFormattingTarget | null,
    session?: CanvasSelectionSession | null,
  ): void {
    if (target) this.target = target;
    if ((this.selecting || this.settlingPointerSelection) && !this.interacting) {
      this.pendingSelection = {
        hasRange,
        rectInfo: rectInfo ?? null,
        formatInfo: formatInfo ?? null,
        target: target ?? this.target,
        session: session ?? null,
      };
      if (this.settlingPointerSelection) {
        this.scheduleSettledPointerSelection();
      }
      return;
    }
    this.applyUpdate(
      hasRange,
      rectInfo ?? null,
      formatInfo ?? null,
      target ?? null,
      session ?? null,
    );
  }

  private applyUpdate(
    hasRange: boolean,
    rectInfo: RichTextSelectionRect | null,
    formatInfo: Record<string, unknown> | null,
    target: RichTextFormattingTarget | null,
    session: CanvasSelectionSession | null,
  ): void {
    if (session && session.sessionId !== this.selectionSessionId) {
      this.hide();
      this.selectionSessionId = session.sessionId;
    }
    if (target) this.target = target;
    if (!this.enabled) {
      this.hide();
      return;
    }
    if (!hasRange || !rectInfo) {
      if (!this.interacting) this.hide();
      return;
    }
    this.formatInfo = formatInfo ?? {};
    this.syncState();
    this.lastReportedRect = rectInfo;
    const wasHidden = this.element.hidden;
    if (wasHidden) {
      this.element.style.visibility = "hidden";
      this.element.hidden = false;
      // The host WebView can paint a newly unhidden container one frame before
      // its native controls and final geometry. Measure it off-screen from the
      // user's perspective, then reveal the complete toolbar atomically.
      this.position(rectInfo, false);
      this.scheduleReveal();
      return;
    }
    this.position(rectInfo, true);
  }

  hide(): void {
    this.visibilityEpoch += 1;
    window.cancelAnimationFrame(this.revealFrame);
    this.revealFrame = 0;
    this.element.style.visibility = "hidden";
    this.element.hidden = true;
    this.colorPopover.hidden = true;
    this.lastReportedRect = null;
  }

  destroy(): void {
    document.removeEventListener("mousedown", this.onDocumentMouseDown, true);
    window.removeEventListener("mouseup", this.onWindowMouseUp, true);
    this.cancelSelectionSettle();
    window.cancelAnimationFrame(this.revealFrame);
    this.element.remove();
    this.colorPopover.remove();
    this.target = null;
    this.selectionSessionId = 0;
  }

  private bind(): void {
    const markInteracting = (event: Event): void => {
      this.interacting = true;
      const target = event.target as HTMLElement | null;
      const isNativeControl =
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLInputElement && target.type !== "color");
      if (!isNativeControl) event.preventDefault();
      event.stopPropagation();
    };
    this.element.addEventListener("mousedown", markInteracting);
    this.colorPopover.addEventListener("mousedown", markInteracting);
    // simple-mind-map ends canvas text editing from its document.body click
    // listener. Toolbar clicks are part of the current edit transaction and
    // must never be reinterpreted as an outside-canvas click.
    this.element.addEventListener("click", (event) => event.stopPropagation());
    this.colorPopover.addEventListener("click", (event) => event.stopPropagation());

    const isolateInputEvent = (event: Event): void => event.stopPropagation();
    [
      "keydown",
      "keyup",
      "beforeinput",
      "input",
      "paste",
      "compositionstart",
      "compositionupdate",
      "compositionend",
    ].forEach((type) =>
      this.colorPopover.addEventListener(type, isolateInputEvent),
    );

    this.element.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-rich-action]",
      );
      if (!button || !this.target) return;
      const action = button.dataset.richAction ?? "";
      this.callbacks.onAction?.(action);
      // Toolbar focus may replace the DOM range in both Quill and the
      // structured outline. Restore the saved range before every command.
      this.target.restoreSelection?.();
      if (["bold", "italic", "underline", "strike"].includes(action)) {
        this.target.formatText(
          nextToggleFormat(action as RichTextBooleanFormat, this.formatInfo),
        );
        this.formatInfo[action] = !Boolean(this.formatInfo[action]);
        this.syncState();
        return;
      }
      switch (action) {
        case "inline-code":
          this.target.toggleInlineCode();
          this.formatInfo.code = !Boolean(this.formatInfo.code);
          this.syncState();
          break;
        case "code-block":
          this.colorPopover.hidden = true;
          this.element.hidden = true;
          this.callbacks.onCodeBlock?.(this.target);
          break;
        case "link":
          this.colorPopover.hidden = true;
          this.element.hidden = true;
          this.callbacks.onLink?.(this.target);
          break;
        case "cloze": {
          const next = !isClozeFormat(this.formatInfo);
          this.target.setCloze(next);
          this.formatInfo.color = next ? "transparent" : undefined;
          this.formatInfo.background = next ? "#f5dfa0" : undefined;
          this.syncState();
          break;
        }
        case "formula":
          this.colorPopover.hidden = true;
          this.element.hidden = true;
          this.callbacks.onFormula?.(this.target);
          break;
        case "clear":
          this.target.clearTextFormat();
          this.formatInfo = {};
          this.syncState();
          break;
        case "color-menu":
          this.openColorPopover("color", button);
          break;
        case "background-menu":
          this.openColorPopover("background", button);
          break;
      }
    });

    this.colorPopover.addEventListener("click", (event) => {
      const swatch = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-color-value]",
      );
      if (swatch) {
        this.applyColor(swatch.dataset.colorValue || false, true);
        return;
      }
      const action = (event.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-color-action]",
      )?.dataset.colorAction;
      if (action === "reset") this.applyColor(false, true);
      if (action === "custom") {
        const current = this.formatInfo[this.activeColorKind];
        this.customColorInput.value =
          typeof current === "string" && /^#[0-9a-f]{6}$/i.test(current)
            ? current
            : "#000000";
        this.customColorInput.click();
      }
    });

    this.customColorInput.addEventListener("input", () =>
      this.applyColor(this.customColorInput.value, false),
    );

    this.bindEditableColorInput("hex");
    this.bindEditableColorInput("rgb");
    this.element
      .querySelector<HTMLSelectElement>('[data-rich-field="size"]')
      ?.addEventListener("change", (event) => {
        this.callbacks.onAction?.("size");
        const value = (event.target as HTMLSelectElement).value || false;
        this.target?.restoreSelection?.();
        this.target?.formatText({ size: value });
        this.formatInfo.size = value || undefined;
        this.syncState(false);
      });
    this.element
      .querySelector<HTMLSelectElement>('[data-rich-field="font"]')
      ?.addEventListener("change", (event) => {
        this.callbacks.onAction?.("font");
        const value = (event.target as HTMLSelectElement).value || false;
        this.target?.restoreSelection?.();
        this.target?.formatText({ font: value });
        this.formatInfo.font = value || undefined;
        this.syncState(false);
      });
  }

  private openColorPopover(kind: ColorKind, anchor: HTMLElement): void {
    this.activeColorKind = kind;
    this.colorSessionOriginal =
      typeof this.formatInfo[kind] === "string"
        ? (this.formatInfo[kind] as string)
        : false;
    this.colorPopover.dataset.kind = kind;
    this.syncColorReadout();
    this.colorPopover.hidden = false;
    const rootRect = this.root.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const width = this.colorPopover.offsetWidth || 320;
    const height = this.colorPopover.offsetHeight || 145;
    const rootWidth =
      this.root.clientWidth || rootRect.width || window.innerWidth;
    const rootHeight =
      this.root.clientHeight || rootRect.height || window.innerHeight;
    const left = Math.max(
      8,
      Math.min(anchorRect.left - rootRect.left, rootWidth - width - 8),
    );
    const below = anchorRect.bottom - rootRect.top + 6;
    const above = anchorRect.top - rootRect.top - height - 6;
    const top = below + height <= rootHeight - 8 ? below : Math.max(8, above);
    this.colorPopover.style.left = `${Math.round(left)}px`;
    this.colorPopover.style.top = `${Math.round(top)}px`;
  }

  private bindEditableColorInput(kind: "hex" | "rgb"): void {
    const input = this.colorPopover.querySelector<HTMLInputElement>(
      `[data-color-input="${kind}"]`,
    );
    if (!input) return;
    input.addEventListener("input", () => {
      const parsed = parseEditableColor(input.value);
      input.setAttribute("aria-invalid", parsed ? "false" : "true");
      if (!parsed) return;
      const other = this.colorPopover.querySelector<HTMLInputElement>(
        `[data-color-input="${kind === "hex" ? "rgb" : "hex"}"]`,
      );
      if (other) {
        other.value = kind === "hex" ? parsed.rgb : parsed.hex;
        other.setAttribute("aria-invalid", "false");
      }
      this.applyColor(parsed.hex, false, false);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        this.cancelColorEditing();
      }
    });
  }

  private cancelColorEditing(): void {
    if (!this.target) {
      this.colorPopover.hidden = true;
      return;
    }
    this.target.restoreSelection?.();
    this.target.formatText({
      [this.activeColorKind]: this.colorSessionOriginal,
    });
    this.formatInfo[this.activeColorKind] =
      this.colorSessionOriginal || undefined;
    this.syncState();
    this.colorPopover.hidden = true;
  }

  private applyColor(
    value: string | false,
    close = true,
    syncInputs = true,
  ): void {
    if (!this.target) return;
    this.callbacks.onAction?.(this.activeColorKind);
    this.target.restoreSelection?.();
    this.target.formatText({ [this.activeColorKind]: value });
    this.formatInfo[this.activeColorKind] = value || undefined;
    this.syncState(syncInputs);
    if (close) this.colorPopover.hidden = true;
  }

  private syncColorReadout(): void {
    const presentation = presentColor(this.formatInfo[this.activeColorKind]);
    const editable = parseEditableColor(this.formatInfo[this.activeColorKind]);
    const hex = this.colorPopover.querySelector<HTMLInputElement>(
      '[data-color-input="hex"]',
    );
    const rgb = this.colorPopover.querySelector<HTMLInputElement>(
      '[data-color-input="rgb"]',
    );
    if (hex) {
      hex.value =
        editable?.hex ?? (presentation.hex === "默认" ? "" : presentation.hex);
      hex.setAttribute("aria-invalid", "false");
    }
    if (rgb) {
      rgb.value = editable?.rgb ?? "";
      rgb.setAttribute("aria-invalid", "false");
    }
    const hexReadout = this.colorPopover.querySelector<HTMLElement>(
      '[data-color-readout="hex"]',
    );
    const rgbReadout = this.colorPopover.querySelector<HTMLElement>(
      '[data-color-readout="rgb"]',
    );
    if (hexReadout) hexReadout.textContent = presentation.hex;
    if (rgbReadout) rgbReadout.textContent = presentation.rgb;
  }

  private syncState(syncInputs = true): void {
    ["bold", "italic", "underline", "strike"].forEach((name) => {
      this.element
        .querySelector(`[data-rich-action="${name}"]`)
        ?.classList.toggle("is-active", Boolean(this.formatInfo[name]));
    });
    this.element
      .querySelector('[data-rich-action="inline-code"]')
      ?.classList.toggle("is-active", Boolean(this.formatInfo.code));
    this.element
      .querySelector('[data-rich-action="link"]')
      ?.classList.toggle("is-active", Boolean(this.formatInfo.link));
    this.element
      .querySelector('[data-rich-action="code-block"]')
      ?.classList.toggle("is-active", Boolean(this.formatInfo["code-block"]));
    const cloze = this.element.querySelector<HTMLButtonElement>(
      '[data-rich-action="cloze"]',
    );
    const clozeActive = isClozeFormat(this.formatInfo);
    cloze?.classList.toggle("is-active", clozeActive);
    if (cloze) cloze.textContent = clozeActive ? "取消模糊" : "模糊";
    const size = this.element.querySelector<HTMLSelectElement>(
      '[data-rich-field="size"]',
    );
    if (size) {
      const currentSize =
        typeof this.formatInfo.size === "string"
          ? this.formatInfo.size.trim()
          : "";
      size.value = (YEMIND_SIZE_VALUES as readonly string[]).includes(currentSize)
        ? currentSize
        : "";
    }
    const font = this.element.querySelector<HTMLSelectElement>(
      '[data-rich-field="font"]',
    );
    if (font) {
      const currentFont =
        typeof this.formatInfo.font === "string"
          ? this.formatInfo.font.trim()
          : "";
      // Computed CSS commonly returns a full fallback stack which is not one
      // of the explicit editor choices. Assigning that unknown value to a
      // native select makes the control render as an empty box, so normalize
      // inherited/unknown/mixed fonts to the visible default option.
      font.value = (YEMIND_FONT_VALUES as readonly string[]).includes(
        currentFont,
      )
        ? currentFont
        : "";
    }
    const color =
      typeof this.formatInfo.color === "string" &&
      this.formatInfo.color !== "transparent"
        ? this.formatInfo.color
        : "currentColor";
    const background =
      typeof this.formatInfo.background === "string"
        ? this.formatInfo.background
        : "transparent";
    this.element
      .querySelector<HTMLElement>('[data-rich-swatch="color"]')
      ?.style.setProperty("--ymz-current-color", color);
    this.element
      .querySelector<HTMLElement>('[data-rich-swatch="background"]')
      ?.style.setProperty("--ymz-current-color", background);
    if (syncInputs) this.syncColorReadout();
  }

  private position(rect: RichTextSelectionRect, allowLiveSelection = true): void {
    const selection = window.getSelection();
    if (
      selection &&
      !selection.isCollapsed &&
      selection.rangeCount > 0 &&
      selection.anchorNode &&
      this.root.contains(selection.anchorNode)
    ) {
      const anchorElement = selection.anchorNode instanceof Element
        ? selection.anchorNode
        : selection.anchorNode.parentElement;
      const activeTextEditor = anchorElement?.closest(
        '.ql-editor,[data-outline-editor],[data-role="outline-text-editor"]',
      );
      const live = selection.getRangeAt(0).getBoundingClientRect();
      if (
        allowLiveSelection
        && activeTextEditor
        && this.root.contains(activeTextEditor)
        && live
        && (live.width || live.height)
      ) {
        rect = {
          left: live.left,
          top: live.top,
          right: live.right,
          bottom: live.bottom,
          width: live.width,
        };
      }
    }
    const rootRect = this.root.getBoundingClientRect();
    const rootWidth =
      this.root.clientWidth || rootRect.width || window.innerWidth;
    const rootHeight =
      this.root.clientHeight || rootRect.height || window.innerHeight;
    const scaleX = rootRect.width > 0 && rootWidth > 0
      ? rootRect.width / rootWidth
      : 1;
    const scaleY = rootRect.height > 0 && rootHeight > 0
      ? rootRect.height / rootHeight
      : 1;
    const width = Math.min(
      this.element.scrollWidth || 820,
      Math.max(240, rootWidth - 16),
    );
    const localLeft = (rect.left - rootRect.left) / scaleX;
    const localTop = (rect.top - rootRect.top) / scaleY;
    const localBottom = (rect.bottom - rootRect.top) / scaleY;
    const localWidth = (rect.width ?? rect.right - rect.left) / scaleX;
    const left = Math.max(
      8,
      Math.min(
        localLeft + localWidth / 2 - width / 2,
        rootWidth - width - 8,
      ),
    );
    const measuredHeight = this.element.offsetHeight || 44;
    const above = localTop - measuredHeight - 8;
    const below = localBottom + 8;
    let top =
      below + measuredHeight <= rootHeight - 8
        ? below
        : Math.max(8, above);
    if (rootWidth <= 720) {
      const canvasEditor = document.querySelector<HTMLElement>(
        'body > .smm-richtext-node-edit-wrap',
      );
      if (canvasEditor && getComputedStyle(canvasEditor).display !== 'none') {
        const editorRect = canvasEditor.getBoundingClientRect();
        const editorTop = (editorRect.top - rootRect.top) / scaleY;
        const editorBottom = (editorRect.bottom - rootRect.top) / scaleY;
        const overlapsEditor =
          top < editorBottom && top + measuredHeight > editorTop;
        if (overlapsEditor) {
          const belowEditor = editorBottom + 8;
          top = belowEditor + measuredHeight <= rootHeight - 8
            ? belowEditor
            : Math.max(8, editorTop - measuredHeight - 8);
        }
      }
    }
    const nextLeft = `${Math.round(left)}px`;
    const nextTop = `${Math.round(top)}px`;
    const nextMaxWidth = `${Math.max(240, rootWidth - 16)}px`;
    if (this.element.style.left !== nextLeft) this.element.style.left = nextLeft;
    if (this.element.style.top !== nextTop) this.element.style.top = nextTop;
    if (this.element.style.maxWidth !== nextMaxWidth) this.element.style.maxWidth = nextMaxWidth;
  }

  private cancelSelectionSettle(): void {
    if (this.selectionSettleTimer) {
      window.clearTimeout(this.selectionSettleTimer);
      this.selectionSettleTimer = 0;
    }
    this.settlingPointerSelection = false;
  }

  private scheduleSettledPointerSelection(): void {
    if (!this.settlingPointerSelection) return;
    if (this.selectionSettleTimer) {
      window.clearTimeout(this.selectionSettleTimer);
    }
    this.selectionSettleTimer = window.setTimeout(() => {
      this.selectionSettleTimer = 0;
      this.settlingPointerSelection = false;
      const pending = this.pendingSelection;
      this.pendingSelection = null;
      const belongsToNewSession = Boolean(
        pending?.session
        && pending.session.sessionId !== this.pointerSessionAtDown,
      );
      if (pending && (this.pointerSelectionMayPublish || belongsToNewSession)) {
        this.applyUpdate(
          pending.hasRange,
          pending.rectInfo,
          pending.formatInfo,
          pending.target,
          pending.session,
        );
      }
      this.pointerSelectionMayPublish = false;
    }, POINTER_SELECTION_SETTLE_MS);
  }

  private scheduleReveal(): void {
    window.cancelAnimationFrame(this.revealFrame);
    const epoch = ++this.visibilityEpoch;
    this.revealFrame = window.requestAnimationFrame(() => {
      if (
        epoch !== this.visibilityEpoch
        || this.element.hidden
        || !this.lastReportedRect
      ) {
        this.revealFrame = 0;
        return;
      }
      this.position(this.lastReportedRect, true);
      // Chromium/WebView2 may paint a flex container before the native
      // <select> controls in that same frame. A second committed frame keeps
      // the empty shell entirely invisible.
      this.revealFrame = window.requestAnimationFrame(() => {
        this.revealFrame = 0;
        if (
          epoch !== this.visibilityEpoch
          || this.element.hidden
          || !this.lastReportedRect
        ) return;
        this.position(this.lastReportedRect, true);
        this.element.style.visibility = "";
      });
    });
  }
}
