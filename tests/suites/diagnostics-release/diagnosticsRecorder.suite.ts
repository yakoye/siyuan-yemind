import { describe, expect, it } from 'vitest';
import { DiagnosticsRecorder } from '../../../src/diagnostics/DiagnosticsRecorder';

describe('DiagnosticsRecorder', () => {
  it('redacts sensitive fields and hashes map ids', () => {
    const recorder = new DiagnosticsRecorder({ sessionId: 'session', now: () => 10 });
    recorder.start();
    recorder.record('editor', 'changed', 'private-map-id', {
      title: 'Private title',
      nodeCount: 3,
      url: 'https://example.com/private',
      safe: 'plain value',
    });

    const event = recorder.listEvents().at(-1)!;
    expect(event.mapKey).toMatch(/^map-/);
    expect(event.mapKey).not.toContain('private-map-id');
    expect(event.details).toEqual({
      title: '[redacted]',
      nodeCount: 3,
      url: '[redacted]',
      safe: 'plain value',
    });
  });

  it('keeps a bounded event ring', () => {
    let now = 0;
    const recorder = new DiagnosticsRecorder({ maxEvents: 50, now: () => ++now });
    recorder.start();
    for (let index = 0; index < 80; index += 1) recorder.record('test', `event-${index}`);
    expect(recorder.listEvents()).toHaveLength(50);
    expect(recorder.listEvents()[0].action).not.toBe('recording-started');
  });
});
