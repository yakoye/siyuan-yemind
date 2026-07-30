import { describe, expect, it, vi } from 'vitest';
import {
  cancelMindMapHistory,
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

  it('cancels a replay-side callback so redo history is not truncated', () => {
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
    installHistoryTransactionCoordinator(mindMap);

    // A renderer/listener may request history while applying BACK. The replay
    // already points at an existing snapshot and must not create a new branch.
    command.addHistory();
    expect(cancelMindMapHistory(mindMap)).toBe(true);
    vi.advanceTimersByTime(200);

    expect(calls).toEqual([]);
    vi.useRealTimers();
  });

  it('ignores asynchronous history requests for the whole replay transaction', () => {
    vi.useFakeTimers();
    const commit = vi.fn();
    const coordinator = new HistoryTransactionCoordinator(commit, 100);

    coordinator.beginReplay();
    coordinator.schedule();
    vi.advanceTimersByTime(500);
    expect(commit).not.toHaveBeenCalled();

    coordinator.endReplay();
    coordinator.schedule();
    vi.advanceTimersByTime(100);
    expect(commit).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
