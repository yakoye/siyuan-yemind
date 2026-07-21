import { describe, expect, it } from 'vitest';
import { runDiagnosticsSelfCheck } from '../../../src/diagnostics/selfCheck';
import { DEFAULT_SETTINGS } from '../../../src/settings/SettingsStore';

describe('runDiagnosticsSelfCheck', () => {
  it('checks storage, lifecycle, tree, settings and editor state', async () => {
    const report = await runDiagnosticsSelfCheck({
      maps: [{
        id: 'map-1', title: 'Private', createdAt: 1, updatedAt: 2,
        layout: 'logicalStructure', theme: 'default',
        data: { data: { text: 'Root', uid: 'root' }, children: [] },
      }],
      checkpoints: [],
      settings: DEFAULT_SETTINGS,
      editors: [{ mapKey: 'map-x', mounted: true, readonly: false, viewMode: 'map', selectedNodeCount: 0, nodeCount: 1, canvasWidth: 800, canvasHeight: 600, zoom: 1, saveState: 'saved' }],
      storageProbe: async () => ({ write: true, read: true, remove: true }),
      lifecycleProbe: async () => ({ create: true, update: true, checkpoint: true, restore: true, cleanup: true }),
      now: () => 100,
    });

    expect(report.status).toBe('pass');
    expect(report.items.map((item) => item.id)).toContain('lifecycle-probe');
    expect(report.items).toHaveLength(6);
  });

  it('reports a failed lifecycle probe', async () => {
    const report = await runDiagnosticsSelfCheck({
      maps: [], checkpoints: [], settings: DEFAULT_SETTINGS, editors: [],
      storageProbe: async () => ({ write: true, read: true, remove: true }),
      lifecycleProbe: async () => ({ create: true, update: false, checkpoint: false, restore: false, cleanup: true }),
    });
    expect(report.status).toBe('fail');
    expect(report.items.find((item) => item.id === 'lifecycle-probe')?.status).toBe('fail');
  });
});
