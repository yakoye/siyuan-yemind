import type { YeMindMapDocument } from '../model/types';
import { PLUGIN_VERSION } from '../plugin/constants';
import { exportFormat, safeExportFilename, type ExportFormatId } from './formatCatalog';
import { exportHtml, exportMarkdown, exportOpml, exportText } from './outlineCodecs';
import {
  createYeMindPackage,
  embedMapFileInSvg,
  embedPackageInPng,
  embedPackageInSvg,
} from './packageCodec';
import { exportXMind } from './xmindCodec';

export interface ExportArtifact {
  filename: string;
  mime: string;
  bytes: Uint8Array;
}

export interface LiveExportRenderer {
  render(type: 'svg' | 'png' | 'pdf'): Promise<string>;
}

const encoder = new TextEncoder();

function dataUrlBytes(value: string): Uint8Array {
  if (!value.startsWith('data:')) return encoder.encode(value);
  const comma = value.indexOf(',');
  if (comma < 0) throw new Error('导出数据无效');
  const header = value.slice(0, comma);
  const payload = value.slice(comma + 1);
  if (/;base64/i.test(header)) {
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(payload, 'base64'));
    const binary = atob(payload);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }
  return encoder.encode(decodeURIComponent(payload));
}

async function renderBytes(renderer: LiveExportRenderer | undefined, type: 'svg' | 'png' | 'pdf'): Promise<Uint8Array> {
  if (!renderer) throw new Error(`${type.toUpperCase()} 导出需要已打开的导图画布`);
  const result = await renderer.render(type);
  if (!result) throw new Error(`${type.toUpperCase()} 画布导出失败`);
  return dataUrlBytes(result);
}

export async function createExportArtifact(
  id: ExportFormatId,
  map: YeMindMapDocument,
  renderer?: LiveExportRenderer,
): Promise<ExportArtifact> {
  const definition = exportFormat(id);
  const base = safeExportFilename(map.title);
  let bytes: Uint8Array;

  if (id === 'markdown') bytes = encoder.encode(exportMarkdown(map));
  else if (id === 'opml') bytes = encoder.encode(exportOpml(map));
  else if (id === 'text') bytes = encoder.encode(exportText(map));
  else if (id === 'html') bytes = encoder.encode(exportHtml(map));
  else if (id === 'yemind-zip') bytes = await createYeMindPackage(map, { appVersion: PLUGIN_VERSION });
  else if (id === 'xmind') bytes = await exportXMind(map);
  else if (id === 'svg') bytes = await renderBytes(renderer, 'svg');
  else if (id === 'yemind-svg') {
    const svg = new TextDecoder().decode(await renderBytes(renderer, 'svg'));
    bytes = encoder.encode(embedMapFileInSvg(svg, map));
  } else if (id === 'yemind-package-svg' || id === 'kmindz') {
    const [svgBytes, packageBytes] = await Promise.all([
      renderBytes(renderer, 'svg'),
      createYeMindPackage(map, { appVersion: PLUGIN_VERSION }),
    ]);
    bytes = encoder.encode(embedPackageInSvg(new TextDecoder().decode(svgBytes), packageBytes));
  } else if (id === 'png') {
    const [png, packageBytes] = await Promise.all([
      renderBytes(renderer, 'png'),
      createYeMindPackage(map, { appVersion: PLUGIN_VERSION }),
    ]);
    bytes = embedPackageInPng(png, packageBytes);
  } else {
    bytes = await renderBytes(renderer, 'pdf');
  }

  return { filename: `${base}${definition.extension}`, mime: definition.mime, bytes };
}

export function downloadExportArtifact(artifact: ExportArtifact): void {
  const blob = new Blob([artifact.bytes as BlobPart], { type: artifact.mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = artifact.filename;
  anchor.click();
  queueMicrotask(() => URL.revokeObjectURL(url));
}
