import { describe, expect, it } from 'vitest';
import { createMindMap } from '../../../src/core/createMindMap';
import {
  normalizeTreeForUpstreamRichText,
  normalizeTreeForUpstreamRichTextInPlaceWithResult,
} from '../../../src/core/upstreamRichTextData';

describe('v1.9.0 upstream runtime rich-text data', () => {
  it('converts plain multiline text into explicit HTML blocks without changing the source tree', () => {
    const source = {
      data: {
        uid: 'root',
        text: 'PCIe <RAS> & LTSSM\n\n错误注入',
        richText: false,
        image: 'data:image/png;base64,abc',
      },
      children: [],
    };

    const runtime = normalizeTreeForUpstreamRichText(source);

    expect(runtime).not.toBe(source);
    expect(runtime.data).toMatchObject({
      uid: 'root',
      text: '<p>PCIe &lt;RAS&gt; &amp; LTSSM</p><p><br></p><p>错误注入</p>',
      richText: true,
      image: 'data:image/png;base64,abc',
    });
    expect(source.data).toMatchObject({
      text: 'PCIe <RAS> & LTSSM\n\n错误注入',
      richText: false,
    });
  });

  it('preserves existing rich HTML and recursively converts children and summaries', () => {
    const source = {
      data: {
        uid: 'root',
        text: '<p><strong>中心主题</strong></p>',
        richText: true,
        generalization: [{ text: '概要\n第二行', richText: false }],
      },
      children: [{
        data: { uid: 'child', text: '子节点', richText: false },
        children: [],
      }],
    };

    const runtime = normalizeTreeForUpstreamRichText(source);

    expect(runtime.data.text).toBe('<p><strong>中心主题</strong></p>');
    expect(runtime.data.richText).toBe(true);
    expect((runtime.data.generalization as Array<Record<string, unknown>>)[0]).toMatchObject({
      text: '<p>概要</p><p>第二行</p>',
      richText: true,
    });
    expect(runtime.children[0].data).toMatchObject({
      text: '<p>子节点</p>',
      richText: true,
    });
  });

  it('represents an empty editable node with one stable Quill line', () => {
    const runtime = normalizeTreeForUpstreamRichText({
      data: { uid: 'empty', text: '', richText: false },
      children: [],
    });

    expect(runtime.data).toMatchObject({ text: '<p><br></p>', richText: true });
  });

  it('reports a one-time canonical migration and remains idempotent afterwards', () => {
    const tree = {
      data: { uid: 'root', text: '中心主题\n第二行', richText: false },
      children: [{
        data: { uid: 'child', text: '<p>已有富文本</p>', richText: true },
        children: [],
      }],
    };

    const first = normalizeTreeForUpstreamRichTextInPlaceWithResult(tree);
    const second = normalizeTreeForUpstreamRichTextInPlaceWithResult(tree);

    expect(first).toMatchObject({ changed: true, tree });
    expect(second).toMatchObject({ changed: false, tree });
    expect(tree.data).toMatchObject({
      text: '<p>中心主题</p><p>第二行</p>',
      richText: true,
    });
    expect(tree.children[0].data.text).toBe('<p>已有富文本</p>');
  });

  it('repairs malformed truthy richText flags instead of trusting imported metadata', () => {
    const tree = {
      data: {
        uid: 'root',
        text: 'PCIe <RAS>',
        richText: 'false' as unknown as boolean,
      },
      children: [],
    };

    const result = normalizeTreeForUpstreamRichTextInPlaceWithResult(tree);

    expect(result.changed).toBe(true);
    expect(tree.data).toMatchObject({
      text: '<p>PCIe &lt;RAS&gt;</p>',
      richText: true,
    });
  });

  it('feeds only normalized rich-text data into the runtime renderer', async () => {
    const svgPrototype = (globalThis as any).SVGElement?.prototype;
    if (svgPrototype) {
      svgPrototype.getBBox = () => ({ x: 0, y: 0, width: 120, height: 32 });
      svgPrototype.getBoundingClientRect = () => ({
        x: 0,
        y: 0,
        left: 0,
        top: 0,
        right: 120,
        bottom: 32,
        width: 120,
        height: 32,
        toJSON() {},
      });
    }
    const canvas = document.createElement('div');
    Object.defineProperties(canvas, {
      clientWidth: { configurable: true, value: 640 },
      clientHeight: { configurable: true, value: 480 },
    });
    canvas.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 640,
      bottom: 480,
      width: 640,
      height: 480,
      toJSON() {},
    });
    document.body.appendChild(canvas);

    const map = createMindMap({
      el: canvas,
      data: {
        data: { uid: 'root', text: '第一行\n第二行', richText: false },
        children: [],
      },
    });

    await new Promise<void>((resolve) => {
      const finish = () => {
        (map as any).off('node_tree_render_end', finish);
        resolve();
      };
      (map as any).on('node_tree_render_end', finish);
    });

    expect((map.getData(false) as any).data).toMatchObject({
      text: '<p>第一行</p><p>第二行</p>',
      richText: true,
    });

    map.destroy();
    canvas.remove();
  });
});
