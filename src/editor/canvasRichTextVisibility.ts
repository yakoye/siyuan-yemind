interface RichTextRuntime {
  textEditNode?: HTMLElement | null;
  node?: {
    style?: { merge?: (key: string) => unknown };
    _textData?: { nodeContent?: { node?: Element | null } };
  } | null;
  showTextEdit?: boolean;
}

interface MindMapRuntime {
  richText?: RichTextRuntime | null;
  renderer?: { textEdit?: { getBackground?: (node: unknown) => unknown } } | null;
}

const hiddenStaticText = new WeakMap<object, HTMLElement[]>();

function restoreStaticText(map: MindMapRuntime): void {
  const previous = hiddenStaticText.get(map as object) ?? [];
  previous.forEach((element) => {
    element.hidden = false;
    element.removeAttribute('aria-hidden');
  });
  hiddenStaticText.delete(map as object);
}

function cssColor(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

export function synchronizeCanvasRichTextVisibility(map: MindMapRuntime | null | undefined): boolean {
  const runtime = map?.richText;
  const wrapper = runtime?.textEditNode;
  const node = runtime?.node;
  if (!wrapper || !node) return false;
  restoreStaticText(map as MindMapRuntime);
  const textColor = cssColor(node.style?.merge?.('color'), '#1f2937');
  const safeBackground = cssColor(map?.renderer?.textEdit?.getBackground?.(node), 'var(--b3-theme-background, #ffffff)');
  wrapper.style.setProperty('color', textColor, 'important');
  wrapper.style.setProperty('caret-color', textColor, 'important');
  wrapper.style.setProperty('-webkit-text-fill-color', 'currentColor', 'important');
  wrapper.style.setProperty('background', safeBackground, 'important');
  wrapper.style.setProperty('border', '0', 'important');
  wrapper.style.setProperty('outline', '0', 'important');
  wrapper.style.setProperty('box-shadow', 'none', 'important');
  wrapper.querySelectorAll<HTMLElement>('.ql-container,.ql-editor').forEach((element) => {
    element.style.setProperty('color', 'inherit', 'important');
    element.style.setProperty('caret-color', 'currentColor', 'important');
    element.style.setProperty('-webkit-text-fill-color', 'currentColor', 'important');
    element.style.setProperty('border', '0', 'important');
    element.style.setProperty('outline', '0', 'important');
    element.style.setProperty('box-shadow', 'none', 'important');
    element.style.setProperty('background', 'transparent', 'important');
  });
  if (runtime.showTextEdit === true && wrapper.style.display !== 'none') {
    const content = node._textData?.nodeContent?.node;
    const staticElements = content
      ? Array.from(content.querySelectorAll<HTMLElement>('.smm-richtext-node-wrap'))
      : [];
    staticElements.forEach((element) => {
      element.hidden = true;
      element.setAttribute('aria-hidden', 'true');
    });
    if (staticElements.length > 0) hiddenStaticText.set(map as object, staticElements);
  }
  return true;
}
