import { describe, expect, it } from 'vitest';
import { SaveRevisionTracker } from '../../../src/editor/saveRevision';

describe('autosave revision tracking', () => {
  it('does not report an older save as current when newer changes are pending', () => {
    const tracker = new SaveRevisionTracker();
    const first = tracker.markChanged();
    const second = tracker.markChanged();

    expect(tracker.markSaved(first)).toBe(false);
    expect(tracker.isDirty()).toBe(true);
    expect(tracker.markSaved(second)).toBe(true);
    expect(tracker.isDirty()).toBe(false);
  });
});
