import { describe, expect, it } from 'vitest';
import { formatCheckpointTime, renderCheckpointListHtml } from '../../../src/checkpoints/checkpointPresentation';
import type { MapCheckpoint } from '../../../src/model/checkpointTypes';

const checkpoint: MapCheckpoint = {
  id: 'cp-1',
  mapId: 'map-1',
  name: '<script>alert(1)</script>',
  kind: 'recovery-protection',
  createdAt: Date.UTC(2026, 6, 17, 1, 2, 3),
  nodeCount: 9,
  snapshot: {
    data: { data: { text: 'Root' }, children: [] },
    layout: 'logicalStructure',
    theme: 'default',
  },
};

describe('checkpoint presentation', () => {
  it('escapes names and shows type, time and node count', () => {
    const html = renderCheckpointListHtml([checkpoint], { readonly: false });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('恢复前保护');
    expect(html).toContain('9 个节点');
    expect(html).toContain('data-checkpoint-action="restore"');
  });

  it('disables restore in readonly mode', () => {
    const html = renderCheckpointListHtml([checkpoint], { readonly: true });
    expect(html).toContain('data-checkpoint-action="restore" disabled');
  });

  it('formats a stable local date string shape', () => {
    expect(formatCheckpointTime(checkpoint.createdAt)).toMatch(/^2026-07-17 \d{2}:\d{2}:\d{2}$/);
  });
});
