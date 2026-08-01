import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// The vendored runtime is JavaScript and intentionally has no internal d.ts files.
// @ts-expect-error testing the runtime-owned measurement host contract directly
import {
  createNodeMeasurementCache,
  removeNodeMeasurementHost,
} from '../../../vendor/simple-mind-map-runtime/src/core/render/node/nodeMeasurementHost';

describe('v0.9.13 hidden-tab node measurement', () => {
  afterEach(() => {
    document.querySelectorAll('[data-smm-node-measurement-host]').forEach((node) => node.remove());
  });

  it('creates measurement caches in one stable body host even when the map is hidden', () => {
    const editor = document.createElement('div');
    editor.className = 'ymz-editor custom-theme';
    const canvas = document.createElement('div');
    canvas.style.display = 'none';
    editor.append(canvas);
    document.body.append(editor);
    const mindMap = { el: canvas, commonCaches: {} };

    const rich = createNodeMeasurementCache(mindMap, 'richtext');
    const custom = createNodeMeasurementCache(mindMap, 'custom');
    const host = rich.parentElement as HTMLElement;

    expect(host).toBe(custom.parentElement);
    expect(host.parentElement).toBe(document.body);
    expect(canvas.contains(host)).toBe(false);
    expect(host.dataset.smmNodeMeasurementHost).toBe('true');
    expect(host.classList.contains('ymz-editor')).toBe(true);
    expect(host.style.visibility).toBe('hidden');
    expect(host.style.pointerEvents).toBe('none');

    removeNodeMeasurementHost(mindMap);
    expect(host.isConnected).toBe(false);
    editor.remove();
  });

  it('does not retain the YeMind relocation and repair coordinator', () => {
    const factorySource = readFileSync(resolve(process.cwd(), 'src/core/createMindMap.ts'), 'utf8');
    const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
    const runtimeSource = readFileSync(
      resolve(process.cwd(), 'vendor/simple-mind-map-runtime/src/core/render/node/nodeCreateContents.js'),
      'utf8',
    );
    const mindMapSource = readFileSync(
      resolve(process.cwd(), 'vendor/simple-mind-map-runtime/index.js'),
      'utf8',
    );

    expect(factorySource).not.toContain('stabilizeMindMapMeasurementHost');
    expect(editorSource).not.toContain('stabilizeMindMapMeasurementHost');
    expect(runtimeSource).toContain("createNodeMeasurementCache(this.mindMap, 'richtext')");
    expect(runtimeSource).toContain("createNodeMeasurementCache(this.mindMap, 'custom')");
    expect(mindMapSource).toContain('removeNodeMeasurementHost(this)');
  });
});
