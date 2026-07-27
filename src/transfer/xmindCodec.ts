import JSZip from 'jszip';
import type { MindMapNodeData, MindMapTree, YeMindMapDocument } from '../model/types';

const uid = (): string => globalThis.crypto?.randomUUID?.() ?? `xmind-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function textValue(data: MindMapNodeData): string {
  const value = String(data.text ?? '');
  if (!data.richText) return value;
  return new DOMParser().parseFromString(`<body>${value}</body>`, 'text/html').body.textContent ?? '';
}

function dataUrl(value: string): { mime: string; bytes: Uint8Array } | null {
  const match = value.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  const bytes = typeof Buffer !== 'undefined'
    ? new Uint8Array(Buffer.from(match[2], 'base64'))
    : Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
  return { mime: match[1], bytes };
}

function bytesDataUrl(mime: string, bytes: Uint8Array): string {
  const base64 = typeof Buffer !== 'undefined'
    ? Buffer.from(bytes).toString('base64')
    : btoa(String.fromCharCode(...bytes));
  return `data:${mime};base64,${base64}`;
}

function imageExtension(mime: string): string {
  return ({ 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' } as Record<string, string>)[mime] ?? 'png';
}

export async function exportXMind(map: YeMindMapDocument): Promise<Uint8Array> {
  const zip = new JSZip();
  const sheetId = `yemind-${Date.now()}`;
  const resources: Record<string, { mime: string; bytes: Uint8Array }> = {};

  const transform = (node: MindMapTree, root = false): Record<string, any> => {
    const id = String(node.data.uid ?? uid());
    const result: Record<string, any> = {
      id,
      title: textValue(node.data),
      structureClass: root ? 'org.xmind.ui.logic.right' : undefined,
      children: { attached: node.children.map((child) => transform(child)) },
    };
    if (node.data.note) result.notes = { plain: { content: String(node.data.note) }, realHTML: { content: String(node.data.note) } };
    if (node.data.hyperlink) result.href = String(node.data.hyperlink);
    if (Array.isArray(node.data.tag) && node.data.tag.length) result.labels = node.data.tag.map(String);
    if (typeof node.data.image === 'string') {
      const image = dataUrl(node.data.image);
      if (image) {
        const path = `resources/${id}.${imageExtension(image.mime)}`;
        resources[path] = image;
        result.image = {
          src: `xap:${path}`,
          width: node.data.imageSize?.width,
          height: node.data.imageSize?.height,
        };
      }
    }
    return result;
  };

  const content = [{
    id: sheetId,
    class: 'sheet',
    title: map.title,
    rootTopic: transform(map.data, true),
  }];
  zip.file('content.json', JSON.stringify(content));
  zip.file('metadata.json', JSON.stringify({
    dataStructureVersion: '2',
    creator: { name: 'YeMind' },
    activeSheetId: sheetId,
  }));
  const manifest: Record<string, unknown> = {
    'file-entries': {
      'content.json': {},
      'metadata.json': {},
      ...Object.fromEntries(Object.keys(resources).map((path) => [path, {}])),
    },
  };
  zip.file('manifest.json', JSON.stringify(manifest));
  Object.entries(resources).forEach(([path, image]) => zip.file(path, image.bytes));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

function topicChildren(topic: any): any[] {
  return Array.isArray(topic?.children?.attached) ? topic.children.attached : [];
}

async function jsonTopic(topic: any, zip: JSZip): Promise<MindMapTree> {
  const data: MindMapNodeData = {
    text: String(topic?.title ?? ''),
    uid: String(topic?.id ?? uid()),
    expand: true,
  };
  const note = topic?.notes?.realHTML?.content ?? topic?.notes?.plain?.content;
  if (typeof note === 'string' && note) data.note = note;
  if (typeof topic?.href === 'string' && /^https?:\/\//i.test(topic.href)) data.hyperlink = topic.href;
  if (Array.isArray(topic?.labels)) data.tag = topic.labels.map(String);
  const src = typeof topic?.image?.src === 'string' ? topic.image.src.replace(/^xap:/, '') : '';
  const imageFile = src ? zip.file(src.replace(/^\//, '')) : null;
  if (imageFile) {
    const bytes = await imageFile.async('uint8array');
    const extension = src.split('.').pop()?.toLowerCase();
    const mime = extension === 'svg' ? 'image/svg+xml' : extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : extension === 'gif' ? 'image/gif' : extension === 'webp' ? 'image/webp' : 'image/png';
    data.image = bytesDataUrl(mime, bytes);
    if (Number(topic.image.width) > 0 && Number(topic.image.height) > 0) {
      data.imageSize = { width: Number(topic.image.width), height: Number(topic.image.height), custom: true };
    }
  }
  return {
    data,
    children: await Promise.all(topicChildren(topic).map((child) => jsonTopic(child, zip))),
  };
}

function directChild(element: Element, name: string): Element | undefined {
  return Array.from(element.children).find((child) => child.localName === name);
}

function oldTopic(element: Element): MindMapTree {
  const title = directChild(element, 'title')?.textContent ?? '';
  const data: MindMapNodeData = {
    text: title,
    uid: element.getAttribute('id') || uid(),
    expand: true,
  };
  const href = element.getAttribute('xlink:href') ?? element.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
  if (href && /^https?:\/\//i.test(href)) data.hyperlink = href;
  const notes = directChild(element, 'notes')?.textContent?.trim();
  if (notes) data.note = notes;
  const labels = directChild(element, 'labels');
  if (labels) data.tag = Array.from(labels.children).map((label) => label.textContent?.trim() ?? '').filter(Boolean);
  const children = directChild(element, 'children');
  const attached = children
    ? Array.from(children.children).find((child) => child.localName === 'topics' && child.getAttribute('type') === 'attached')
    : undefined;
  return {
    data,
    children: attached ? Array.from(attached.children).filter((child) => child.localName === 'topic').map(oldTopic) : [],
  };
}

export async function importXMind(bytes: Uint8Array): Promise<MindMapTree> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new Error('XMind 文件损坏');
  }
  const jsonFile = zip.file('content.json');
  if (jsonFile) {
    const sheets = JSON.parse(await jsonFile.async('string')) as any[];
    const root = sheets?.[0]?.rootTopic;
    if (!root) throw new Error('XMind 文件没有根主题');
    return jsonTopic(root, zip);
  }
  const xmlFile = zip.file('content.xml') ?? zip.file('/content.xml');
  if (!xmlFile) throw new Error('XMind 文件缺少 content.json/content.xml');
  const document = new DOMParser().parseFromString(await xmlFile.async('string'), 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('XMind XML 内容损坏');
  const sheet = Array.from(document.getElementsByTagName('*')).find((element) => element.localName === 'sheet');
  const root = sheet ? Array.from(sheet.children).find((element) => element.localName === 'topic') : undefined;
  if (!root) throw new Error('XMind 文件没有根主题');
  return oldTopic(root);
}

