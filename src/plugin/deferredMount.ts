export interface DeferredMountState {
  destroyed: boolean;
}

export async function mountAfterReady<T>(
  state: DeferredMountState,
  ready: Promise<void>,
  resolveValue: () => T,
  mount: (value: T) => void,
): Promise<void> {
  await ready;
  if (state.destroyed) return;
  const value = resolveValue();
  if (state.destroyed) return;
  mount(value);
}
