export async function runSafeOperation<T>(
  operation: () => Promise<T>,
  onError: (error: unknown) => void,
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    onError(error);
    return undefined;
  }
}
