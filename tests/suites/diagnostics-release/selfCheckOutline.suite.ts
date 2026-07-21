import { describe, expect, it } from 'vitest';
import { runDiagnosticsSelfCheck } from '../../../src/diagnostics/selfCheck';
import { DEFAULT_SETTINGS } from '../../../src/settings/SettingsStore';

describe('diagnostics self-check in outline mode', () => {
  it('does not warn about a zero-size canvas that is intentionally hidden by outline mode', async () => {
    const report = await runDiagnosticsSelfCheck({
      maps: [],
      checkpoints: [],
      settings: DEFAULT_SETTINGS,
      editors: [{
        mapKey: 'map-test',
        mounted: true,
        readonly: false,
        viewMode: 'outline',
        selectedNodeCount: 0,
        nodeCount: 1,
        canvasWidth: 0,
        canvasHeight: 0,
        zoom: 1,
        saveState: 'saved',
      }],
      storageProbe: async () => ({ write: true, read: true, remove: true }),
      lifecycleProbe: async () => ({ create: true, update: true, checkpoint: true, restore: true, cleanup: true }),
      now: () => 1,
    });

    expect(report.items.find((item) => item.id === 'open-editors')?.status).toBe('pass');
  });
});
