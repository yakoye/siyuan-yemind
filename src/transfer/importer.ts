import JSZip from 'jszip';
import { createDefaultMap } from '../model/defaultMap';
import type { MindMapTree, YeMindMapDocument } from '../model/types';
import { parseOutlineDocument } from './outlineCodecs';
import {
  extractMapFileFromSvg,
  extractKmindPackageFromPng,
  extractKmindPackageFromSvg,
  extractPackageFromPng,
  extractPackageFromSvg,
  isPng,
  isZip,
  assertSafeZipEntries,
  readYeMindPackage,
} from './packageCodec';
import { importXMind } from './xmindCodec';

export interface MindMapImportSource {
  name: string;
  bytes: Uint8Array;
  type?: string;
}

interface ImportOptions {
  id?: () => string;
  now?: () => number;
}

const decoder = new TextDecoder();
const MAX_IMPORT_BYTES = 100 * 1024 * 1024;
const MAX_LEGACY_JSON_CHARS = 20 * 1024 * 1024;

function isTree(value: unknown): value is MindMapTree {
  const candidate = value as Partial<MindMapTree> | null;
  return Boolean(candidate?.data && typeof candidate.data.text === 'string' && Array.isArray(candidate.children));
}

function normalizeImportedMap(
  source: Partial<YeMindMapDocument> & { data: MindMapTree },
  title: string,
  options: ImportOptions,
): YeMindMapDocument {
  const now = options.now?.() ?? Date.now();
  const map = createDefaultMap(
    typeof source.title === 'string' && source.title.trim() ? source.title : title,
    options.id?.() ?? globalThis.crypto?.randomUUID?.() ?? `map-${now}`,
    now,
  );
  return {
    ...map,
    data: source.data,
    layout: typeof source.layout === 'string' ? source.layout : map.layout,
    layoutPresetId: typeof source.layoutPresetId === 'string' ? source.layoutPresetId : undefined,
    theme: typeof source.theme === 'string' ? source.theme : map.theme,
    lineStyle: source.lineStyle === 'straight' || source.lineStyle === 'direct' ? source.lineStyle : 'curve',
    projectStyle: source.projectStyle && typeof source.projectStyle === 'object' ? source.projectStyle : map.projectStyle,
    viewData: source.viewData && typeof source.viewData === 'object' ? source.viewData : undefined,
    studyCards: Array.isArray(source.studyCards) ? source.studyCards : map.studyCards,
  };
}

function titleFromName(name: string): string {
  return name
    .replace(/\.yemindz\.svg$/i, '')
    .replace(/\.yemind\.svg$/i, '')
    .replace(/\.yemindz\.zip$/i, '')
    .replace(/\.yemind\.zip$/i, '')
    .replace(/\.[^.]+$/, '')
    .trim() || '导入导图';
}

function mapFromJson(value: unknown, name: string, options: ImportOptions): YeMindMapDocument {
  const record = value as Record<string, any> | null;
  let source: Partial<YeMindMapDocument> & { data: MindMapTree };
  if (record?.product === 'YeMind' && record?.format === 'yemind-map' && isTree(record.map?.data)) {
    source = record.map;
  } else if (isTree(record?.data) && typeof record?.title === 'string') {
    source = record as unknown as Partial<YeMindMapDocument> & { data: MindMapTree };
  } else if (isTree(record?.root)) {
    source = {
      data: record.root,
      title: typeof record.title === 'string' ? record.title : titleFromName(name),
      layout: record.layout,
      theme: record.theme?.template ?? record.theme,
      viewData: record.view,
    };
  } else if (isTree(value)) {
    source = { data: value, title: titleFromName(name) };
  } else if (record?.nodes && typeof record.nodes === 'object') {
    const nodes = record.nodes as Record<string, Record<string, any>>;
    const roots = Array.isArray(record.roots)
      ? record.roots.map(String)
      : [record.rootId ?? record.rootNodeId].filter(Boolean).map(String);
    const seen = new Set<string>();
    const richText = (value: unknown): string => {
      const parts: string[] = [];
      const walk = (node: any): void => {
        if (!node || typeof node !== 'object') return;
        if (typeof node.text === 'string') parts.push(node.text);
        if (Array.isArray(node.content)) node.content.forEach(walk);
      };
      walk(value);
      return parts.join(' ').trim();
    };
    const build = (nodeId: string): MindMapTree => {
      if (seen.has(nodeId)) return { data: { text: '循环引用', uid: nodeId }, children: [] };
      seen.add(nodeId);
      const node = nodes[nodeId] ?? {};
      const content = node.content;
      const contentText = content?.kind === 'plain-text'
        ? String(content.text ?? '')
        : richText(content?.doc ?? content);
      const childIds = (Array.isArray(node.children) ? node.children : Array.isArray(node.childIds) ? node.childIds : [])
        .map((child: unknown) => typeof child === 'string' ? child : String((child as any)?.id ?? ''))
        .filter(Boolean);
      const tree: MindMapTree = {
        data: {
          text: String(node.text ?? contentText ?? '未命名节点'),
          uid: String(node.id ?? nodeId),
          expand: true,
        },
        children: childIds.map(build),
      };
      seen.delete(nodeId);
      return tree;
    };
    const trees = roots.filter((rootId) => nodes[rootId]).map(build);
    if (trees.length === 0) throw new Error('KMind 文件中没有可识别的根节点');
    const tree = trees.length === 1
      ? trees[0]
      : { data: { text: titleFromName(name), expand: true }, children: trees };
    source = { data: tree, title: titleFromName(name), layout: record.layout };
  } else {
    throw new Error('JSON/KMind 文件中没有可识别的导图根节点');
  }
  return normalizeImportedMap(source, titleFromName(name), options);
}

async function mapFromZip(source: MindMapImportSource, options: ImportOptions): Promise<YeMindMapDocument> {
  try {
    const map = await readYeMindPackage(source.bytes);
    return normalizeImportedMap(map, titleFromName(source.name), options);
  } catch (error) {
    const zip = await JSZip.loadAsync(source.bytes).catch(() => null);
    if (!zip) throw error;
    assertSafeZipEntries(zip);
    if (zip.file('content.json') || zip.file('content.xml') || zip.file('/content.xml')) {
      const tree = await importXMind(source.bytes);
      if (!isTree(tree)) throw new Error('XMind 文件没有可识别的根节点');
      return normalizeImportedMap({ data: tree, title: titleFromName(source.name) }, titleFromName(source.name), options);
    }
    const candidates = Object.values(zip.files)
      .filter((entry) => !entry.dir && /\.json$/i.test(entry.name))
      .slice(0, 20);
    for (const entry of candidates) {
      try {
        const json = await entry.async('string');
        if (json.length > MAX_LEGACY_JSON_CHARS) continue;
        return mapFromJson(JSON.parse(json), source.name, options);
      } catch {
        // Continue searching legacy KMindZ JSON entries.
      }
    }
    throw error instanceof Error ? error : new Error('无法识别压缩包中的导图数据');
  }
}

export async function importMindMapBytes(
  source: MindMapImportSource,
  options: ImportOptions = {},
): Promise<YeMindMapDocument> {
  if (!source.bytes?.length) throw new Error('文件为空');
  if (source.bytes.length > MAX_IMPORT_BYTES) throw new Error('文件超过 100 MB，已停止导入');
  if (isPng(source.bytes)) {
    const packageBytes = extractPackageFromPng(source.bytes) ?? extractKmindPackageFromPng(source.bytes);
    if (!packageBytes) throw new Error('这是普通 PNG 图片，没有可恢复的导图数据');
    return mapFromZip({ ...source, bytes: packageBytes }, options);
  }

  const text = decoder.decode(source.bytes);
  if (/<svg[\s>]/i.test(text.slice(0, 4096))) {
    const map = extractMapFileFromSvg(text);
    if (map) return normalizeImportedMap(map, titleFromName(source.name), options);
    const packageBytes = extractPackageFromSvg(text);
    if (packageBytes) return normalizeImportedMap(await readYeMindPackage(packageBytes), titleFromName(source.name), options);
    const kmindPackage = extractKmindPackageFromSvg(text);
    if (kmindPackage) return mapFromZip({ ...source, bytes: kmindPackage }, options);
    throw new Error('这是普通 SVG 图片，没有可恢复的导图数据');
  }

  if (isZip(source.bytes)) return mapFromZip(source, options);

  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (/^[{[]/.test(trimmed)) {
    try {
      return mapFromJson(JSON.parse(trimmed), source.name, options);
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error('JSON/KMind 文件格式损坏');
      throw error;
    }
  }

  const lower = source.name.toLowerCase();
  if (/\.(md|opml|txt|mm)$/i.test(lower) || /<(opml|map)[\s>]/i.test(trimmed)) {
    const tree = parseOutlineDocument(source.name, trimmed);
    return normalizeImportedMap({ data: tree, title: titleFromName(source.name) }, titleFromName(source.name), options);
  }
  throw new Error('无法自动识别该文件格式');
}
