export type ClipboardImageKind = 'image' | 'clipart';

export interface ClipboardImageResource {
  kind: ClipboardImageKind;
  source: string;
  title: string;
}

export type ClipboardCopyIntent =
  | { kind: 'text' }
  | { kind: 'resource'; resource: ClipboardImageResource }
  | { kind: 'nodes' }
  | { kind: 'none' };

export interface ClipboardCopyContext {
  trigger: 'keyboard' | 'context-menu';
  hasTextSelection: boolean;
  directResource: ClipboardImageResource | null;
  selectedResource: ClipboardImageResource | null;
  hasNodeSelection: boolean;
}

export interface ClipboardTransferWriter {
  setData(type: string, value: string): void;
}

export interface ClipboardImageWriteOptions {
  clipboard?: Pick<Clipboard, 'write' | 'writeText'> | null;
  ClipboardItemCtor?: typeof ClipboardItem | null;
  fetchBlob?: (source: string) => Promise<Blob>;
}

export type ClipboardImageWriteResult = 'binary' | 'text' | 'none';

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function normalizedResource(resource: ClipboardImageResource): ClipboardImageResource {
  return {
    kind: resource.kind === 'clipart' ? 'clipart' : 'image',
    source: String(resource.source ?? '').trim(),
    title: String(resource.title ?? '').trim(),
  };
}

function resourcePlainText(resource: ClipboardImageResource): string {
  return resource.title || resource.source;
}

function resourceHtml(resource: ClipboardImageResource): string {
  const source = escapeAttribute(resource.source);
  const title = escapeAttribute(resource.title);
  return `<img src="${source}" alt="${title}" data-yemind-resource-kind="${resource.kind}">`;
}

async function defaultFetchBlob(source: string): Promise<Blob> {
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Image clipboard request failed: ${response.status}`);
  return response.blob();
}

export function resolveClipboardCopyIntent(
  context: ClipboardCopyContext,
): ClipboardCopyIntent {
  if (context.trigger === 'context-menu' && context.directResource) {
    return { kind: 'resource', resource: normalizedResource(context.directResource) };
  }
  if (context.hasTextSelection) return { kind: 'text' };
  if (context.selectedResource) {
    return { kind: 'resource', resource: normalizedResource(context.selectedResource) };
  }
  if (context.hasNodeSelection) return { kind: 'nodes' };
  return { kind: 'none' };
}

export function writeImageResourceToTransfer(
  input: ClipboardImageResource,
  transfer: ClipboardTransferWriter,
): void {
  const resource = normalizedResource(input);
  transfer.setData('text/plain', resourcePlainText(resource));
  transfer.setData('text/html', resourceHtml(resource));
}

export async function writeImageResourceToClipboard(
  input: ClipboardImageResource,
  options: ClipboardImageWriteOptions = {},
): Promise<ClipboardImageWriteResult> {
  const resource = normalizedResource(input);
  const clipboard = options.clipboard
    ?? (typeof navigator !== 'undefined' ? navigator.clipboard : null);
  const ClipboardItemCtor = options.ClipboardItemCtor
    ?? (typeof ClipboardItem === 'function' ? ClipboardItem : null);
  const fetchBlob = options.fetchBlob ?? defaultFetchBlob;
  const plain = resourcePlainText(resource);
  const html = resourceHtml(resource);

  if (resource.source && clipboard?.write && ClipboardItemCtor) {
    try {
      const image = await fetchBlob(resource.source);
      const imageType = image.type.startsWith('image/') ? image.type : 'image/png';
      await clipboard.write([new ClipboardItemCtor({
        [imageType]: image,
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      })]);
      return 'binary';
    } catch {
      // Keep the explicit resource intent and degrade to a readable fallback.
    }
  }

  if (clipboard?.writeText) {
    await clipboard.writeText(plain);
    return 'text';
  }
  return 'none';
}
