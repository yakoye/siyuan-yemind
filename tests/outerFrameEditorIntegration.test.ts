import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');

describe('outer-frame editor integration', () => {
  it('subscribes only to native outer-frame lifecycle events and rerenders through the plugin', () => {
    expect(source).toContain("this.map.on('outer_frame_active'");
    expect(source).toContain("this.map.on('outer_frame_deactivate'");
    expect(source).toContain("this.map.on('outer_frame_delete'");
    expect(source).toContain('outerFrame?.renderOuterFrames?.()');
    expect(source).not.toContain('parseAddNodeList');
    expect(source).not.toContain('outerFrameCoordinates');
  });
});
