import { YEMIND_FONT_VALUES, YEMIND_SIZE_VALUES } from "./YeMindRichText";
import {
  isClozeFormat,
  nextToggleFormat,
  type RichTextBooleanFormat,
} from "./richTextActions";
import type { RichTextFormattingTarget } from "./richTextTarget";
import { parseEditableColor, presentColor } from "./colorPresentation";
import { colorPaletteInnerHtml } from "./colorPalette";

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
  private target: RichTextFormattingTarget | null = null;
  private activeColorKind: ColorKind = "color";
  private colorSessionOriginal: string | false = false;
  private readonly onDocumentMouseDown = (event: MouseEvent): void => {
    const node = event.target as Node;
    if (!this.element.contains(node) && !this.colorPopover.contains(node))
      this.hide();
  };
  private readonly onWindowMouseUp = (): void => {
    window.setTimeout(() => {
      this.interacting = false;
    }, 0);
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
      <button type="button" data-rich-action="formula" title="插入公式" aria-label="插入公式"><span class="ymz-formula-symbol" aria-hidden="true">π</span></button>
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
  ): void {
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
    this.element.hidden = false;
    this.position(rectInfo);
  }

  hide(): void {
    this.element.hidden = true;
    this.colorPopover.hidden = true;
  }

  destroy(): void {
    document.removeEventListener("mousedown", this.onDocumentMouseDown, true);
    window.removeEventListener("mouseup", this.onWindowMouseUp, true);
    this.element.remove();
    this.colorPopover.remove();
    this.target = null;
  }

  private bind(): void {
    const markInteracting = (event: Event): void => {
      this.interacting = true;
      const target = event.target as HTMLElement | null;
      const isTextInput =
        target instanceof HTMLInputElement && target.type !== "color";
      if (!isTextInput) event.preventDefault();
      event.stopPropagation();
    };
    this.element.addEventListener("mousedown", markInteracting);
    this.colorPopover.addEventListener("mousedown", markInteracting);

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
        this.target?.formatText({
          size: (event.target as HTMLSelectElement).value || false,
        });
      });
    this.element
      .querySelector<HTMLSelectElement>('[data-rich-field="font"]')
      ?.addEventListener("change", (event) => {
        this.callbacks.onAction?.("font");
        this.target?.formatText({
          font: (event.target as HTMLSelectElement).value || false,
        });
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
    if (size)
      size.value =
        typeof this.formatInfo.size === "string" ? this.formatInfo.size : "";
    const font = this.element.querySelector<HTMLSelectElement>(
      '[data-rich-field="font"]',
    );
    if (font) {
      const currentFont = typeof this.formatInfo.font === "string"
        ? this.formatInfo.font.trim()
        : "";
      // Computed CSS commonly returns a full fallback stack which is not one
      // of the explicit editor choices. Assigning that unknown value to a
      // native select makes the control render as an empty box, so normalize
      // inherited/unknown/mixed fonts to the visible default option.
      font.value = (YEMIND_FONT_VALUES as readonly string[]).includes(currentFont)
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

  private position(rect: RichTextSelectionRect): void {
    const rootRect = this.root.getBoundingClientRect();
    const rootWidth =
      this.root.clientWidth || rootRect.width || window.innerWidth;
    const rootHeight =
      this.root.clientHeight || rootRect.height || window.innerHeight;
    const width = Math.min(
      this.element.scrollWidth || 820,
      Math.max(240, rootWidth - 16),
    );
    const localLeft = rect.left - rootRect.left;
    const localTop = rect.top - rootRect.top;
    const localBottom = rect.bottom - rootRect.top;
    const left = Math.max(
      8,
      Math.min(
        localLeft + (rect.width ?? 0) / 2 - width / 2,
        rootWidth - width - 8,
      ),
    );
    const measuredHeight = this.element.offsetHeight || 44;
    const below = localBottom + 8;
    const top =
      below + measuredHeight < rootHeight
        ? below
        : Math.max(8, localTop - measuredHeight - 8);
    this.element.style.left = `${Math.round(left)}px`;
    this.element.style.top = `${Math.round(top)}px`;
    this.element.style.maxWidth = `${Math.max(240, rootWidth - 16)}px`;
  }
}
