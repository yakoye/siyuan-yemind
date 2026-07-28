import JSZip from 'jszip';
import type { YeMindMapDocument } from '../model/types';

export interface YeMindMapFile {
  product: 'YeMind';
  format: 'yemind-map';
  version: 1;
  exportedAt: string;
  map: YeMindMapDocument;
}

interface PackageOptions {
  appVersion?: string;
  now?: () => string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const PNG_PACKAGE_MARKER = encoder.encode('\nYEMINDZ-PACKAGE\0');
const MAX_PACKAGE_BYTES = 100 * 1024 * 1024;
const MAX_PACKAGE_ENTRIES = 512;
const MAX_PACKAGE_JSON_CHARS = 20 * 1024 * 1024;
const MAX_PACKAGE_ENTRY_BYTES = 24 * 1024 * 1024;
const MAX_PACKAGE_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;

interface ZipBudgetOptions {
  maxEntries?: number;
  maxEntryBytes?: number;
  maxTotalUncompressedBytes?: number;
  maxCompressionRatio?: number;
}

function entrySizes(entry: object): { compressed: number; uncompressed: number } {
  const data = (entry as unknown as {
    _data?: { compressedSize?: number; uncompressedSize?: number };
  })._data;
  return {
    compressed: Number(data?.compressedSize ?? 0),
    uncompressed: Number(data?.uncompressedSize ?? 0),
  };
}

export function assertSafeZipEntries(zip: JSZip, options: ZipBudgetOptions = {}): void {
  const maxEntries = options.maxEntries ?? MAX_PACKAGE_ENTRIES;
  const maxEntryBytes = options.maxEntryBytes ?? MAX_PACKAGE_ENTRY_BYTES;
  const maxTotal = options.maxTotalUncompressedBytes ?? MAX_PACKAGE_UNCOMPRESSED_BYTES;
  const maxRatio = options.maxCompressionRatio ?? 1000;
  const entries = Object.values(zip.files);
  if (entries.length > maxEntries) throw new Error('压缩包文件数量过多');
  let total = 0;
  for (const entry of entries) {
    if (entry.name.includes('..') || /^[\\/]/.test(entry.name)) {
      throw new Error('压缩包包含不安全路径');
    }
    if (entry.dir) continue;
    const { compressed, uncompressed } = entrySizes(entry);
    if (uncompressed > maxEntryBytes) throw new Error(`压缩包文件过大：${entry.name}`);
    total += uncompressed;
    if (total > maxTotal) throw new Error('压缩包解压后总大小超出限制');
    if (uncompressed > 5 * 1024 * 1024 && compressed > 0 && uncompressed / compressed > maxRatio) {
      throw new Error(`压缩包压缩比异常：${entry.name}`);
    }
  }
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(value, 'base64'));
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export function createYeMindMapFile(
  map: YeMindMapDocument,
  now: () => string = () => new Date().toISOString(),
): YeMindMapFile {
  return clone({ product: 'YeMind', format: 'yemind-map', version: 1, exportedAt: now(), map });
}

export async function createYeMindPackage(
  map: YeMindMapDocument,
  options: PackageOptions = {},
): Promise<Uint8Array> {
  const now = options.now ?? (() => new Date().toISOString());
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify({
    product: 'YeMind',
    format: 'yemind-package',
    version: 1,
    appVersion: options.appVersion ?? 'unknown',
    createdAt: now(),
    mapPath: 'map.json',
  }, null, 2));
  zip.file('map.json', JSON.stringify(createYeMindMapFile(map, now), null, 2));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

function validateMapFile(value: unknown): YeMindMapFile {
  const candidate = value as Partial<YeMindMapFile> | null;
  if (!candidate || candidate.product !== 'YeMind' || candidate.format !== 'yemind-map' || candidate.version !== 1) {
    throw new Error('不支持的 YeMind 单图格式');
  }
  if (!candidate.map?.data?.data || typeof candidate.map.title !== 'string') {
    throw new Error('YeMind 导图数据不完整');
  }
  return clone(candidate as YeMindMapFile);
}

export async function readYeMindPackage(bytes: Uint8Array): Promise<YeMindMapDocument> {
  if (bytes.byteLength > MAX_PACKAGE_BYTES) throw new Error('YeMind 压缩包超过 100 MB 限制');
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new Error('YeMind 压缩包损坏');
  }
  assertSafeZipEntries(zip);
  const manifestFile = zip.file('manifest.json');
  if (!manifestFile) throw new Error('压缩包不是 YeMind 格式');
  const manifestJson = await manifestFile.async('string');
  if (manifestJson.length > MAX_PACKAGE_JSON_CHARS) throw new Error('YeMind manifest 过大');
  const manifest = JSON.parse(manifestJson) as Record<string, unknown>;
  if (manifest.product !== 'YeMind' || manifest.format !== 'yemind-package' || manifest.version !== 1) {
    throw new Error('不支持的 YeMind 压缩包版本');
  }
  const path = typeof manifest.mapPath === 'string' ? manifest.mapPath : 'map.json';
  const mapFile = zip.file(path);
  if (!mapFile) throw new Error('YeMind 压缩包缺少 map.json');
  const mapJson = await mapFile.async('string');
  if (mapJson.length > MAX_PACKAGE_JSON_CHARS) throw new Error('YeMind 导图数据超过 20 MB 限制');
  return validateMapFile(JSON.parse(mapJson)).map;
}

function insertMetadata(svg: string, id: string, kind: string, payload: string): string {
  if (!/<svg[\s>]/i.test(svg) || !/<\/svg>\s*$/i.test(svg)) throw new Error('SVG 数据无效');
  const metadata = `<metadata id="${id}" data-format="${kind}" data-version="1">${payload}</metadata>`;
  return svg.replace(/<\/svg>\s*$/i, `${metadata}</svg>`);
}

export function embedMapFileInSvg(svg: string, map: YeMindMapDocument): string {
  const bytes = encoder.encode(JSON.stringify(createYeMindMapFile(map)));
  return insertMetadata(svg, 'yemind-document', 'yemind-map', bytesToBase64(bytes));
}

export function embedPackageInSvg(svg: string, bytes: Uint8Array): string {
  return insertMetadata(svg, 'yemind-package', 'yemind-package', bytesToBase64(bytes));
}

export function extractMapFileFromSvg(svg: string): YeMindMapDocument | null {
  const match = svg.match(/<metadata\b[^>]*\bid=["']yemind-document["'][^>]*>([\s\S]*?)<\/metadata>/i);
  if (!match) return null;
  return validateMapFile(JSON.parse(decoder.decode(base64ToBytes(match[1].trim())))).map;
}

export function extractPackageFromSvg(svg: string): Uint8Array | null {
  const match = svg.match(/<metadata\b[^>]*\bid=["']yemind-package["'][^>]*>([\s\S]*?)<\/metadata>/i);
  return match ? base64ToBytes(match[1].trim()) : null;
}

export function extractKmindPackageFromSvg(svg: string): Uint8Array | null {
  for (const id of ['kmind-document-zip', 'kmindz-docs']) {
    const pattern = new RegExp(`<metadata\\b[^>]*\\bid=["']${id}["'][^>]*>([\\s\\S]*?)<\\/metadata>`, 'i');
    const match = svg.match(pattern);
    if (match) return base64ToBytes(match[1].trim().replace(/\s+/g, ''));
  }
  return null;
}

export function embedPackageInPng(png: Uint8Array, packageBytes: Uint8Array): Uint8Array {
  if (!PNG_SIGNATURE.every((value, index) => png[index] === value)) throw new Error('PNG 数据无效');
  const result = new Uint8Array(png.length + PNG_PACKAGE_MARKER.length + 4 + packageBytes.length);
  result.set(png);
  result.set(PNG_PACKAGE_MARKER, png.length);
  const view = new DataView(result.buffer);
  view.setUint32(png.length + PNG_PACKAGE_MARKER.length, packageBytes.length, false);
  result.set(packageBytes, png.length + PNG_PACKAGE_MARKER.length + 4);
  return result;
}

export function extractPackageFromPng(png: Uint8Array): Uint8Array | null {
  if (!PNG_SIGNATURE.every((value, index) => png[index] === value)) return null;
  outer: for (let index = png.length - PNG_PACKAGE_MARKER.length - 4; index >= 8; index -= 1) {
    for (let offset = 0; offset < PNG_PACKAGE_MARKER.length; offset += 1) {
      if (png[index + offset] !== PNG_PACKAGE_MARKER[offset]) continue outer;
    }
    const size = new DataView(png.buffer, png.byteOffset + index + PNG_PACKAGE_MARKER.length, 4).getUint32(0, false);
    const start = index + PNG_PACKAGE_MARKER.length + 4;
    if (start + size === png.length && size <= MAX_PACKAGE_BYTES) return png.slice(start);
  }
  return null;
}

export function extractKmindPackageFromPng(png: Uint8Array): Uint8Array | null {
  if (!isPng(png) || png.length < 20) return null;
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let offset = 8;
  while (offset + 12 <= png.length) {
    const size = view.getUint32(offset, false);
    const type = String.fromCharCode(...png.slice(offset + 4, offset + 8));
    const dataStart = offset + 8;
    const dataEnd = dataStart + size;
    if (dataEnd + 4 > png.length) throw new Error('PNG 文件块越界');
    if (type === 'kmNd') {
      const data = png.slice(dataStart, dataEnd);
      if (String.fromCharCode(...data.slice(0, 4)) !== 'KMND' || data[4] !== 1 || data.length < 16) {
        throw new Error('不支持的 KMind PNG 包');
      }
      const packageSize = new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(8, false);
      if (16 + packageSize > data.length) throw new Error('KMind PNG 包数据不完整');
      return data.slice(16, 16 + packageSize);
    }
    if (type === 'IEND') break;
    offset = dataEnd + 4;
  }
  return null;
}

export function isPng(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((value, index) => bytes[index] === value);
}

export function isZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b && [0x03, 0x05, 0x07].includes(bytes[2]) && [0x04, 0x06, 0x08].includes(bytes[3]);
}
