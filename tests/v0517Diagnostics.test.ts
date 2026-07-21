import { describe, expect, it } from 'vitest';
import { DiagnosticsRecorder } from '../src/diagnostics/DiagnosticsRecorder';
import { runDiagnosticsSelfCheck } from '../src/diagnostics/selfCheck';

describe('v0.5.17 diagnostics', () => {
  it('marks problem moments and returns a focused event window', () => {
    let now = 100_000;
    const recorder = new DiagnosticsRecorder({ now: () => now, maxEvents: 100, sessionId: 's' });
    recorder.start();
    recorder.record('outline', 'edit-start', 'map');
    now += 10_000;
    const marker = recorder.markProblem('outline-exited');
    now += 15_000;
    recorder.record('outline', 'destroy', 'map');
    now += 30_000;
    recorder.record('editor', 'late', 'map');
    const window = recorder.problemWindow(marker.id, 60_000, 20_000);
    expect(window?.events.map((event) => event.action)).toEqual(expect.arrayContaining(['edit-start', 'problem-marked', 'destroy']));
    expect(window?.events.some((event) => event.action === 'late')).toBe(false);
  });

  it('coalesces repeated view changes instead of filling the event buffer', () => {
    let now = 1;
    const recorder = new DiagnosticsRecorder({ now: () => now, maxEvents: 100, sessionId: 's' });
    recorder.start();
    recorder.record('editor', 'view-change', 'map', { zoom: 1 });
    now += 10;
    recorder.record('editor', 'view-change', 'map', { zoom: 1.1 });
    now += 10;
    recorder.record('editor', 'view-change', 'map', { zoom: 1.2 });
    const changes = recorder.listEvents().filter((event) => event.action === 'view-change');
    expect(changes).toHaveLength(1);
    expect(changes[0].details).toMatchObject({ zoom: 1.2, coalesced: 3 });
  });

  it('fails self-check when manifest, runtime and build versions disagree', async () => {
    const report = await runDiagnosticsSelfCheck({
      maps: [], checkpoints: [], settings: {
        autosaveDelayMs: 100, minZoomRatio: 0.2, maxZoomRatio: 3, fitPadding: 20,
        secondLevelMarginX: 10, secondLevelMarginY: 10, nodeMarginX: 10, nodeMarginY: 10,
      } as any,
      editors: [],
      versions: { manifest: '0.5.17', runtime: '0.5.16', build: '0.5.17' },
      storageProbe: async () => ({ write: true, read: true, remove: true }),
      lifecycleProbe: async () => ({ create: true, update: true, checkpoint: true, restore: true, cleanup: true }),
      now: () => 1,
    });
    const version = report.items.find((item) => item.id === 'version-consistency');
    expect(version?.status).toBe('fail');
  });
});
