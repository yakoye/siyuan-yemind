import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildRelationOptions } from '../../../src/core/relationConfig';
import { DEFAULT_SETTINGS } from '../../../src/settings/SettingsStore';

describe('v0.9.11 adjustable association lines', () => {
  it('enables native Bézier control points by default', () => {
    expect(buildRelationOptions(DEFAULT_SETTINGS).enableAdjustAssociativeLinePoints).toBe(true);
  });

  it('keeps control offsets and endpoint positions in persisted relation data', () => {
    const dataSource = readFileSync(resolve(process.cwd(), 'src/core/relationData.ts'), 'utf8');
    expect(dataSource).toContain('associativeLinePoint');
    expect(dataSource).toContain('associativeLineTargetControlOffsets');
  });

  it('documents the tangent-driven arrow behavior in the active relation surface', () => {
    const presentation = readFileSync(resolve(process.cwd(), 'src/editor/relationPresentation.ts'), 'utf8');
    expect(presentation).toContain('拖动两个控制点调整曲线弧度');
    expect(presentation).toContain('箭头方向随终点切线变化');
  });
});
