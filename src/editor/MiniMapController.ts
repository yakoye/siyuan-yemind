import type MindMap from 'simple-mind-map';

interface MiniMapCalculation {
  svgHTML: string;
  viewBoxStyle: Record<'left' | 'right' | 'top' | 'bottom', string>;
}

export function fitMiniMapSvg(svg: SVGSVGElement | null): boolean {
  if (!svg) return false;
  const width = Number.parseFloat(svg.getAttribute('width') ?? '');
  const height = Number.parseFloat(svg.getAttribute('height') ?? '');
  if (!(width > 0) || !(height > 0)) return false;
  if (!svg.hasAttribute('viewBox')) svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  return true;
}

export class MiniMapController {
  private readonly content: HTMLElement;
  private readonly viewport: HTMLElement;
  private frame: number | null = null;
  private visible = true;
  private draggingViewport = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly map: MindMap,
    private readonly element: HTMLElement,
  ) {
    this.content = element.querySelector<HTMLElement>('[data-role="minimap-content"]')!;
    this.viewport = element.querySelector<HTMLElement>('[data-role="minimap-viewport"]')!;
    element.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
    ['node_tree_render_end', 'scale', 'translate', 'data_change', 'layout_change']
      .forEach((event) => (map as any).on?.(event, this.schedule));
    (map as any).on?.('mini_map_view_box_position_change', this.onViewportChange);
    this.schedule();
  }

  destroy(): void {
    if (this.frame !== null) window.cancelAnimationFrame(this.frame);
    this.frame = null;
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    ['node_tree_render_end', 'scale', 'translate', 'data_change', 'layout_change']
      .forEach((event) => (this.map as any).off?.(event, this.schedule));
    (this.map as any).off?.('mini_map_view_box_position_change', this.onViewportChange);
  }

  toggle(): boolean {
    this.setVisible(!this.visible);
    return this.visible;
  }

  setVisible(visible: boolean): void {
    this.visible = Boolean(visible);
    this.element.hidden = !this.visible;
    this.root.dataset.minimapVisible = String(this.visible);
    if (this.visible) this.schedule();
  }

  refresh(): void {
    this.schedule();
  }

  private readonly schedule = (): void => {
    if (!this.visible || this.frame !== null) return;
    this.frame = window.requestAnimationFrame(() => {
      this.frame = null;
      this.render();
    });
  };

  private render(): void {
    const plugin = (this.map as any).miniMap;
    if (!plugin?.calculationMiniMap || this.element.hidden) return;
    const width = Math.max(120, this.element.clientWidth);
    const height = Math.max(72, this.element.clientHeight);
    try {
      const state = plugin.calculationMiniMap(width, height) as MiniMapCalculation;
      this.content.innerHTML = state.svgHTML;
      fitMiniMapSvg(this.content.querySelector<SVGSVGElement>('svg'));
      this.applyViewportStyle(state.viewBoxStyle);
    } catch {
      // The first frame can precede the mind-map renderer; the next map event retries.
    }
  }

  private applyViewportStyle(style: Partial<Record<'left' | 'right' | 'top' | 'bottom', string>>): void {
    (['left', 'right', 'top', 'bottom'] as const).forEach((key) => {
      if (style[key] !== undefined) this.viewport.style[key] = style[key]!;
    });
  }

  private readonly onViewportChange = (style: MiniMapCalculation['viewBoxStyle']): void => {
    this.applyViewportStyle(style);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    const plugin = (this.map as any).miniMap;
    this.draggingViewport = Boolean((event.target as Element).closest('[data-role="minimap-viewport"]'));
    if (this.draggingViewport) plugin?.onViewBoxMousedown?.(event);
    else plugin?.onMousedown?.(event);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const plugin = (this.map as any).miniMap;
    if (this.draggingViewport) plugin?.onViewBoxMousemove?.(event);
    else plugin?.onMousemove?.(event, 4);
  };

  private readonly onPointerUp = (): void => {
    (this.map as any).miniMap?.onMouseup?.();
    this.draggingViewport = false;
    this.schedule();
  };
}
