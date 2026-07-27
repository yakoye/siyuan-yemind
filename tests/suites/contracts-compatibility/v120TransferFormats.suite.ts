import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { createDefaultMap } from '../../../src/model/defaultMap';
import {
  EXPORT_FORMATS,
  IMPORT_ACCEPT,
} from '../../../src/transfer/formatCatalog';
import {
  exportHtml,
  exportMarkdown,
  exportOpml,
  exportText,
  parseOutlineDocument,
} from '../../../src/transfer/outlineCodecs';
import {
  createYeMindPackage,
  embedMapFileInSvg,
  embedPackageInPng,
  embedPackageInSvg,
  readYeMindPackage,
} from '../../../src/transfer/packageCodec';
import { importMindMapBytes } from '../../../src/transfer/importer';
import { exportXMind, importXMind } from '../../../src/transfer/xmindCodec';

const encoder = new TextEncoder();

function sampleMap() {
  const map = createDefaultMap('接口设计', 'source', 100);
  map.data = {
    data: { text: '接口设计', uid: 'root', expand: true },
    children: [
      {
        data: { text: '用户 API', uid: 'user', hyperlink: 'https://example.com' },
        children: [{ data: { text: '创建用户', uid: 'create' }, children: [] }],
      },
      { data: { text: '订单 API', uid: 'order' }, children: [] },
    ],
  };
  return map;
}

describe('v1.2.0 transfer format contracts', () => {
  it('publishes the requested export order with YeMind SVG as default', () => {
    expect(EXPORT_FORMATS.map((item) => item.extension)).toEqual([
      '.yemind.svg',
      '.yemindz.svg',
      '.svg',
      '.kmindz',
      '.yemindz.zip',
      '.md',
      '.opml',
      '.xmind',
      '.png',
      '.txt',
      '.html',
      '.pdf',
    ]);
    expect(EXPORT_FORMATS[0].default).toBe(true);
    expect(IMPORT_ACCEPT).toContain('.kmindz');
    expect(IMPORT_ACCEPT).toContain('.yemind');
    expect(IMPORT_ACCEPT).toContain('.mm');
  });

  it('round-trips a complete YeMind map through the zip package', async () => {
    const map = sampleMap();
    const bytes = await createYeMindPackage(map, {
      appVersion: '1.2.0',
      now: () => '2026-07-27T00:00:00.000Z',
    });
    expect(new TextDecoder().decode(bytes.slice(0, 2))).toBe('PK');
    await expect(readYeMindPackage(bytes)).resolves.toEqual(map);
  });

  it('embeds recoverable payloads in valid SVG and PNG containers', async () => {
    const map = sampleMap();
    const zip = await createYeMindPackage(map);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>';
    const mapSvg = embedMapFileInSvg(svg, map);
    const packageSvg = embedPackageInSvg(svg, zip);
    const png = embedPackageInPng(
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 73, 69, 78, 68]),
      zip,
    );

    expect(mapSvg).toContain('id="yemind-document"');
    expect(packageSvg).toContain('id="yemind-package"');
    expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);

    await expect(importMindMapBytes({ name: 'map.yemind.svg', bytes: encoder.encode(mapSvg) }, {
      id: () => 'svg-import',
      now: () => 200,
    })).resolves.toMatchObject({ id: 'svg-import', title: map.title, data: map.data });
    await expect(importMindMapBytes({ name: 'map.png', bytes: png }, {
      id: () => 'png-import',
      now: () => 300,
    })).resolves.toMatchObject({ id: 'png-import', title: map.title, data: map.data });
  });

  it('exports readable outline formats with escaped markup', () => {
    const map = sampleMap();
    map.data.children[0].data.text = '用户 <API> & 权限';
    expect(exportMarkdown(map)).toContain('## 用户 <API> & 权限');
    expect(exportText(map)).toContain('  用户 <API> & 权限');
    expect(exportOpml(map)).toContain('用户 &lt;API&gt; &amp; 权限');
    expect(exportHtml(map)).toContain('用户 &lt;API&gt; &amp; 权限');
    expect(exportHtml(map)).toContain('application/yemind+json');
  });

  it('imports Markdown, OPML, plain text and FreeMind outlines', () => {
    const markdown = parseOutlineDocument('notes.md', '# 根\n\n## 分支\n\n### 叶子');
    const opml = parseOutlineDocument(
      'notes.opml',
      '<?xml version="1.0"?><opml version="2.0"><body><outline text="根"><outline text="分支"/></outline></body></opml>',
    );
    const text = parseOutlineDocument('notes.txt', '根\n  分支\n    叶子');
    const mm = parseOutlineDocument(
      'notes.mm',
      '<map version="1.0.1"><node TEXT="根"><node TEXT="分支"/></node></map>',
    );
    expect(markdown.children[0].children[0].data.text).toBe('叶子');
    expect(opml.children[0].data.text).toBe('分支');
    expect(text.children[0].children[0].data.text).toBe('叶子');
    expect(mm.children[0].data.text).toBe('分支');
  });

  it('auto-detects legacy JSON and rejects a plain non-package image', async () => {
    const tree = sampleMap().data;
    await expect(importMindMapBytes({
      name: 'legacy.kmind',
      bytes: encoder.encode(JSON.stringify({ root: tree, layout: 'mindMap' })),
    }, {
      id: () => 'legacy',
      now: () => 400,
    })).resolves.toMatchObject({ id: 'legacy', layout: 'mindMap', data: tree });

    await expect(importMindMapBytes({
      name: 'plain.png',
      bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    })).rejects.toThrow(/普通 PNG|导图数据/);
  });

  it('imports the KMindZ SVG package contract used by the reference plugin', async () => {
    const zip = new JSZip();
    zip.file('manifest.json', JSON.stringify({
      schemaVersion: 1,
      rootDocId: 'doc',
      documents: [{ id: 'doc', title: 'KMind 导图', path: 'documents/doc.json' }],
    }));
    zip.file('documents/doc.json', JSON.stringify({
      schemaVersion: 1,
      roots: ['root'],
      nodes: {
        root: { id: 'root', text: 'KMind 根', children: ['child'] },
        child: { id: 'child', text: 'KMind 子节点', children: [] },
      },
    }));
    const packageBytes = await zip.generateAsync({ type: 'uint8array' });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><metadata id="kmind-document-zip" data-kmind="document-zip-v1" data-encoding="base64">${Buffer.from(packageBytes).toString('base64')}</metadata></svg>`;
    await expect(importMindMapBytes({
      name: 'reference.kmindz',
      bytes: encoder.encode(svg),
    }, {
      id: () => 'kmindz-import',
      now: () => 500,
    })).resolves.toMatchObject({
      id: 'kmindz-import',
      data: {
        data: { text: 'KMind 根' },
        children: [{ data: { text: 'KMind 子节点' } }],
      },
    });
  });

  it('round-trips XMind content without Node stream dependencies', async () => {
    const map = sampleMap();
    const bytes = await exportXMind(map);
    const tree = await importXMind(bytes);
    expect(tree.data.text).toBe('接口设计');
    expect(tree.children[0].data.hyperlink).toBe('https://example.com');
    expect(tree.children[0].children[0].data.text).toBe('创建用户');
  });
});
