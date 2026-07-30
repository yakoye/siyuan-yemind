import { describe, expect, it, vi } from 'vitest';
import {
  HistoryTransactionCoordinator,
  installHistoryTransactionCoordinator,
} from '../../../src/core/historyTransactionCoordinator';

describe('history transaction coordinator', () => {
  it('flushes one pending history snapshot synchronously and cancels its old timer', () => {
    vi.useFakeTimers();
    const commit = vi.fn();
    const coordinator = new HistoryTransactionCoordinator(commit, 100);

    coordinator.schedule();
    coordinator.schedule();
    expect(commit).not.toHaveBeenCalled();

    expect(coordinator.flush()).toBe(true);
    expect(commit).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(200);
    expect(commit).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('makes undo flush the latest text transaction before moving the history pointer', () => {
    vi.useFakeTimers();
    const calls: string[] = [];
    const command = {
      addHistory: vi.fn(),
      originAddHistory: () => calls.push('commit'),
    };
    const mindMap = {
      opt: { addHistoryTime: 100 },
      command,
    };

    const installed = installHistoryTransactionCoordinator(mindMap);
    command.addHistory();
    installed.flush();
    calls.push('back');

    expect(calls).toEqual(['commit', 'back']);
    vi.advanceTimersByTime(200);
    expect(calls).toEqual(['commit', 'back']);
    vi.useRealTimers();
  });
});
