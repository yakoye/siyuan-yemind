/**
 * Compatibility adapter for reading existing KMind Zen files.
 * The adapter is read/write isolated from the editor core so file migrations
 * cannot affect node editing, history, or UI commands.
 */
export interface ImportedMap {
  title: string;
  data: Record<string, unknown>;
  sourcePath?: string;
}

export async function importKmindZenFile(_bytes: Uint8Array): Promise<ImportedMap> {
  throw new Error("KMind Zen compatibility adapter is not implemented in v0.3.0");
}
