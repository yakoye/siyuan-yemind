export const IMAGE_PREVIEW_MIN_SCALE = 0.2;
export const IMAGE_PREVIEW_MAX_SCALE = 6;

export function clampImagePreviewScale(value: number): number {
  return Math.max(IMAGE_PREVIEW_MIN_SCALE, Math.min(IMAGE_PREVIEW_MAX_SCALE, Math.round(value * 100) / 100));
}

export function nextImagePreviewScale(current: number, deltaY: number): number {
  const factor = deltaY < 0 ? 1.12 : 1 / 1.12;
  return clampImagePreviewScale(current * factor);
}

export class ImageLightbox {
  private readonly overlay: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly image: HTMLImageElement;
  private readonly scaleLabel: HTMLElement;
  private scale = 1;
  private naturalWidth = 0;
  private naturalHeight = 0;

  constructor(private readonly root: HTMLElement) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'ymz-image-lightbox';
    this.overlay.hidden = true;
    this.overlay.innerHTML = `<div class="ymz-image-lightbox__toolbar"><span data-role="scale">100%</span><button type="button" data-action="reset" aria-label="恢复原始比例">1:1</button><button type="button" data-action="close" aria-label="关闭图片预览">×</button></div><div class="ymz-image-lightbox__stage"><img alt=""></div>`;
    this.stage = this.overlay.querySelector('.ymz-image-lightbox__stage') as HTMLElement;
    this.image = this.overlay.querySelector('img') as HTMLImageElement;
    this.scaleLabel = this.overlay.querySelector('[data-role="scale"]') as HTMLElement;
    this.overlay.addEventListener('click', this.onClick);
    this.overlay.addEventListener('wheel', this.onWheel, { passive: false });
    document.addEventListener('keydown', this.onKeydown, true);
    this.image.addEventListener('load', this.onLoad);
    root.appendChild(this.overlay);
  }

  show(source: string, title = ''): void {
    if (!source) return;
    this.overlay.hidden = false;
    this.image.alt = title;
    this.image.title = title;
    this.scale = 1;
    this.naturalWidth = 0;
    this.naturalHeight = 0;
    this.image.src = source;
    this.sync();
  }

  hide(): void {
    this.overlay.hidden = true;
    this.image.removeAttribute('src');
    this.image.removeAttribute('style');
    this.scale = 1;
  }

  destroy(): void {
    this.overlay.removeEventListener('click', this.onClick);
    this.overlay.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('keydown', this.onKeydown, true);
    this.image.removeEventListener('load', this.onLoad);
    this.overlay.remove();
  }

  private readonly onLoad = (): void => {
    this.naturalWidth = this.image.naturalWidth || 1;
    this.naturalHeight = this.image.naturalHeight || 1;
    const availableWidth = Math.max(120, this.stage.clientWidth - 48);
    const availableHeight = Math.max(120, this.stage.clientHeight - 48);
    this.scale = clampImagePreviewScale(Math.min(1, availableWidth / this.naturalWidth, availableHeight / this.naturalHeight));
    this.sync();
  };

  private readonly onWheel = (event: WheelEvent): void => {
    if (this.overlay.hidden) return;
    event.preventDefault();
    this.scale = nextImagePreviewScale(this.scale, event.deltaY);
    this.sync();
  };

  private readonly onClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    if (target === this.overlay || target === this.stage || target.closest('[data-action="close"]')) {
      this.hide();
      return;
    }
    if (target.closest('[data-action="reset"]')) {
      this.scale = 1;
      this.sync();
    }
  };

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (!this.overlay.hidden && event.key === 'Escape') {
      event.preventDefault();
      this.hide();
    }
  };

  private sync(): void {
    this.scaleLabel.textContent = `${Math.round(this.scale * 100)}%`;
    if (this.naturalWidth > 0 && this.naturalHeight > 0) {
      this.image.style.width = `${Math.round(this.naturalWidth * this.scale)}px`;
      this.image.style.height = `${Math.round(this.naturalHeight * this.scale)}px`;
    }
  }
}
