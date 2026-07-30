import { describe, expect, it } from 'vitest';
import { CanvasEditSessionCoordinator } from '../../../src/editor/CanvasEditSessionCoordinator';

describe('v1.6.1 canvas edit session coordinator', () => {
  it('invalidates every geometry and selection result from the previous node session', () => {
    const sessions = new CanvasEditSessionCoordinator();
    const first = sessions.begin('node-a');
    expect(first.phase).toBe('opening');
    expect(sessions.markEditorReady(first.id, {
      geometryReady: true,
      contentReady: true,
    })?.phase).toBe('active');
    expect(sessions.acceptSelection(first.id)).toEqual({
      sessionId: first.id,
      uid: 'node-a',
      selectionEpoch: 1,
    });

    const second = sessions.begin('node-b');

    expect(second.id).toBeGreaterThan(first.id);
    expect(second.phase).toBe('opening');
    expect(second.selectionEpoch).toBe(0);
    expect(sessions.markEditorReady(first.id, {
      geometryReady: true,
      contentReady: true,
    })).toBeNull();
    expect(sessions.acceptSelection(first.id)).toBeNull();
    expect(sessions.close(first.id)).toBe(false);
    expect(sessions.snapshot().uid).toBe('node-b');
  });

  it('publishes selections only after the current editor content and geometry are ready', () => {
    const sessions = new CanvasEditSessionCoordinator();
    const opening = sessions.begin('node-ready');

    expect(sessions.acceptSelection(opening.id)).toBeNull();
    expect(sessions.markEditorReady(opening.id, {
      geometryReady: true,
      contentReady: false,
    })?.phase).toBe('opening');
    expect(sessions.acceptSelection(opening.id)).toBeNull();
    expect(sessions.markEditorReady(opening.id, {
      geometryReady: true,
      contentReady: true,
    })?.phase).toBe('active');
    expect(sessions.acceptSelection(opening.id)?.selectionEpoch).toBe(1);
    expect(sessions.close(opening.id)).toBe(true);
    expect(sessions.snapshot()).toMatchObject({
      phase: 'idle',
      uid: '',
      selectionEpoch: 0,
    });
  });
});
