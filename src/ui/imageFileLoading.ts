export interface LoadedImageFile {
  dataUrl: string;
  size: { width: number; height: number };
}

export interface ImageFileLoadingDependencies {
  read(file: File): Promise<string>;
  measure(dataUrl: string): Promise<{ width: number; height: number }>;
  onError(error: unknown): void;
}

export async function loadImageFileSelection(
  file: File,
  dependencies: ImageFileLoadingDependencies,
): Promise<LoadedImageFile | null> {
  try {
    const dataUrl = await dependencies.read(file);
    const size = await dependencies.measure(dataUrl);
    return { dataUrl, size };
  } catch (error) {
    dependencies.onError(error);
    return null;
  }
}
