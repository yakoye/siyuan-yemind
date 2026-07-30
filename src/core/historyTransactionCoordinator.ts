type HistoryCommand = {
  addHistory: (...args: unknown[]) => void;
  originAddHistory?: () => void;
  yemindFlushHistory?: () => boolean;
  yemindCancelHistory?: () => boolean;
};

type HistoryMindMap = {
  opt?: { addHistoryTime?: number };
  command?: HistoryCommand;
};

/**
 * Owns the delayed history boundary used by simple-mind-map.
 *
 * Upstream uses an opaque trailing timer. That timer cannot be flushed before
 * an immediate undo, so BACK can otherwise skip the just-finished text edit.
 * YeMind keeps the same coalescing delay while exposing an atomic flush/cancel
 * boundary for undo, redo and teardown.
 */
export class HistoryTransactionCoordinator {
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly commit: () => void,
    private readonly delay: number,
  ) {}

  schedule(): void {
    if (this.timer !== null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.commit();
    }, Math.max(0, this.delay));
  }

  flush(): boolean {
    if (this.timer === null) return false;
    clearTimeout(this.timer);
    this.timer = null;
    this.commit();
    return true;
  }

  cancel(): boolean {
    if (this.timer === null) return false;
    clearTimeout(this.timer);
    this.timer = null;
    return true;
  }

  commitNow(): void {
    this.cancel();
    this.commit();
  }
}

export function installHistoryTransactionCoordinator(
  mindMap: HistoryMindMap,
  options: { seed?: boolean } = {},
): HistoryTransactionCoordinator {
  const command = mindMap.command;
  if (!command) throw new Error('mind-map history command is unavailable');
  const existing = (command as HistoryCommand & {
    yemindHistoryCoordinator?: HistoryTransactionCoordinator;
  }).yemindHistoryCoordinator;
  if (existing) return existing;

  const commit = typeof command.originAddHistory === 'function'
    ? command.originAddHistory.bind(command)
    : command.addHistory.bind(command);
  const coordinator = new HistoryTransactionCoordinator(
    commit,
    Number(mindMap.opt?.addHistoryTime ?? 100),
  );
  command.addHistory = () => coordinator.schedule();
  command.yemindFlushHistory = () => coordinator.flush();
  command.yemindCancelHistory = () => coordinator.cancel();
  (command as HistoryCommand & {
    yemindHistoryCoordinator?: HistoryTransactionCoordinator;
  }).yemindHistoryCoordinator = coordinator;
  if (options.seed) coordinator.commitNow();
  return coordinator;
}

export function flushMindMapHistory(mindMap: HistoryMindMap): boolean {
  return Boolean(mindMap.command?.yemindFlushHistory?.());
}
