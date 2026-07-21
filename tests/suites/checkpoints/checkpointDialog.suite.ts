import { describe, expect, it } from 'vitest';
import { buildCheckpointDialogContent } from '../../../src/ui/checkpointDialogTemplate';
import type { MapCheckpoint } from '../../../src/model/checkpointTypes';

const item: MapCheckpoint = {
  id: 'cp-1',
  mapId: 'map-1',
  name: 'Stable',
  kind: 'manual',
  createdAt: 1,
  nodeCount: 2,
  snapshot: {
    data: { data: { text: 'Root' }, children: [] },
    layout: 'logicalStructure',
    theme: 'default',
  },
};

describe('checkpoint manager dialog', () => {
  it('contains a refreshable list surface and close action', () => {
    const html = buildCheckpointDialogContent([item], false);
    expect(html).toContain('data-role="checkpoint-list"');
    expect(html).toContain('data-checkpoint-id="cp-1"');
    expect(html).toContain('data-checkpoint-dialog-action="close"');
  });

  it('marks readonly state so restore is disabled without hiding history', () => {
    const html = buildCheckpointDialogContent([item], true);
    expect(html).toContain('data-checkpoint-action="restore" disabled');
    expect(html).toContain('Stable');
  });
});
