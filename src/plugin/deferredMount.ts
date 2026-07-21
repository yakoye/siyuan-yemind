export interface DeferredMountState {
  destroyed: boolean;
}

export async function mountAfterReady<T>(
  state: DeferredMountState,
  ready: Promise<void>,
  resolveValue: () => T,
  mount: (value: T) => void | Promise<void>,
  onError?: (error: unknown) => void,
): Promise<void> {
  try {
    await ready;
    if (state.destroyed) return;
    const value = resolveValue();
    if (state.destroyed) return;
    await mount(value);
  } catch (error) {
    if (!state.destroyed) onError?.(error);
  }
}
