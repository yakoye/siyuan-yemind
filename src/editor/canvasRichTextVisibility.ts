interface RichTextRuntime {
  textEditNode?: HTMLElement | null;
  node?: {
    getData?: (key: string) => unknown;
    style?: { merge?: (key: string) => unknown };
    group?: { node?: Element | null } | null;
    _textData?: {
      node?: { node?: Element | null };
      nodeContent?: { node?: Element | null };
    };
  } | null;
  showTextEdit?: boolean;
  getEditSessionSnapshot?: () => {
    phase?: string;
    geometryReady?: boolean;
    contentReady?: boolean;
  };
}

interface MindMapRuntime {
  richText?: RichTextRuntime | null;
  renderer?: { textEdit?: { getBackground?: (node: unknown) => unknown } } | null;
}

interface HiddenStaticText {
  element: HTMLElement | SVGElement;
  visibility: string;
  visibilityPriority: string;
  ariaHidden: string | null;
}

const hiddenStaticText = new WeakMap<object, HiddenStaticText[]>();

function restoreStaticText(map: MindMapRuntime): void {
  const previous = hiddenStaticText.get(map as object) ?? [];
  previous.forEach((entry) => {
    if (entry.visibility) {
      entry.element.style.setProperty(
        'visibility',
        entry.visibility,
        entry.visibilityPriority,
      );
    } else {
      entry.element.style.removeProperty('visibility');
    }
    if (entry.ariaHidden === null) entry.element.removeAttribute('aria-hidden');
    else entry.element.setAttribute('aria-hidden', entry.ariaHidden);
  });
  hiddenStaticText.delete(map as object);
}

function cssColor(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function replacementEditorReady(wrapper: HTMLElement, node: RichTextRuntime['node']): boolean {
  if (wrapper.dataset.yemindGeometryReady !== 'true') return false;
  if (wrapper.style.display === 'none') return false;
  const editor = wrapper.querySelector<HTMLElement>('.ql-editor');
  if (!editor) return false;
  const sourceText = String(node?.getData?.('text') ?? '').trim();
  if (!sourceText) return true;
  if (String(editor.textContent ?? '').trim()) return true;
  return Boolean(editor.querySelector('img,svg,.ql-formula,[data-yemind-formula]'));
}

function staticTextLayers(node: RichTextRuntime['node']): Array<HTMLElement | SVGElement> {
  const group = node?._textData?.node?.node;
  if (group instanceof HTMLElement || group instanceof SVGElement) return [group];
  const content = node?._textData?.nodeContent?.node;
  if (!content) return [];
  return Array.from(
    content.querySelectorAll<HTMLElement>('.smm-richtext-node-wrap'),
  );
}

/**
 * Upstream's width-drag DOM reconciliation (nodeModifyWidth.js#preserveLiveTextData)
 * is meant to always reuse the same outer text group, but a live-edit commit
 * (RenderLifecycleCoordinator) rebuilding `_textData` in the same window can
 * race it into creating a second outer group instead of reusing the first.
 * `node._textData` only ever points at the newest one, so the older sibling
 * is orphaned: never hidden by synchronizeCanvasRichTextVisibility(), never
 * removed by anything, and stays permanently visible next to the live text
 * as a second, duplicate node label. Sweep for any wrap element under the
 * node's own SVG group that is not part of the currently tracked layer(s)
 * and drop it — it can only ever be stale duplicate paint, never legitimate
 * content, since real multi-line content stays nested under the one tracked
 * outer group.
 */
function removeOrphanedStaticTextLayers(
  node: RichTextRuntime['node'],
  current: Array<HTMLElement | SVGElement>,
): void {
  const root = node?.group?.node;
  if (!root) return;
  const allWraps = root.querySelectorAll<HTMLElement>('.smm-text-node-wrap,.smm-richtext-node-wrap');
  if (allWraps.length === 0) return;
  allWraps.forEach((wrap) => {
    if (current.some((owner) => owner === wrap || owner.contains(wrap))) return;
    wrap.remove();
  });
}

export function synchronizeCanvasRichTextVisibility(map: MindMapRuntime | null | undefined): boolean {
  if (!map) return false;
  // Teardown clears richText.node before consumers receive hide_text_edit.
  // Restore the previously hidden SVG layer before checking whether an active
  // editor still exists, otherwise an unchanged edit can leave the node blank.
  restoreStaticText(map);
  const runtime = map?.richText;
  const wrapper = runtime?.textEditNode;
  const node = runtime?.node;
  if (!wrapper || !node) return false;
  removeOrphanedStaticTextLayers(node, staticTextLayers(node));
  const textColor = cssColor(node.style?.merge?.('color'), '#1f2937');
  wrapper.style.setProperty('color', textColor, 'important');
  wrapper.style.setProperty('caret-color', textColor, 'important');
  wrapper.style.setProperty('-webkit-text-fill-color', 'currentColor', 'important');
  // The SVG node owns the visual shape and background. The HTML editor is
  // only its live text layer; painting a second opaque rectangle here exposes
  // the intentional text/node padding as a visibly mismatched inner box.
  wrapper.style.setProperty('background', 'transparent', 'important');
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
  const session = runtime.getEditSessionSnapshot?.();
  const sessionReady = !session || (
    session.phase === 'active'
    && session.geometryReady === true
    && session.contentReady === true
  );
  if (
    runtime.showTextEdit === true
    && sessionReady
    && replacementEditorReady(wrapper, node)
  ) {
    const staticElements = staticTextLayers(node);
    const snapshots = staticElements.map((element) => ({
      element,
      visibility: element.style.getPropertyValue('visibility'),
      visibilityPriority: element.style.getPropertyPriority('visibility'),
      ariaHidden: element.getAttribute('aria-hidden'),
    }));
    staticElements.forEach((element) => {
      element.style.setProperty('visibility', 'hidden', 'important');
      element.setAttribute('aria-hidden', 'true');
    });
    if (snapshots.length > 0) hiddenStaticText.set(map as object, snapshots);
  }
  return true;
}
