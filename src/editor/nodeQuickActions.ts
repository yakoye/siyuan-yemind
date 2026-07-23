export type NodeQuickActionName = 'collapse' | 'expand' | 'add-child';

export interface NodeQuickActionDescriptor {
  action: NodeQuickActionName;
  label: string;
  text: string;
}

export interface NodeQuickActionState {
  isRoot: boolean;
  childCount: number;
  expanded: boolean;
  selected: boolean;
  hovered?: boolean;
}

export function describeNodeQuickActions(state: NodeQuickActionState): NodeQuickActionDescriptor[] {
  const childCount = Math.max(0, Math.trunc(Number(state.childCount) || 0));
  if (!state.selected && !state.hovered) return [];
  const actions: NodeQuickActionDescriptor[] = [];
  if (childCount > 0) {
    actions.push(state.expanded
      ? { action: 'collapse', label: `折叠 ${childCount} 个子孙节点`, text: '−' }
      : { action: 'expand', label: `展开 ${childCount} 个子孙节点`, text: String(childCount) });
  }
  actions.push({ action: 'add-child', label: '添加子节点', text: '+' });
  return actions;
}

function descendantCount(node: any): number {
  const children = Array.isArray(node?.nodeData?.children)
    ? node.nodeData.children
    : Array.isArray(node?.children)
      ? node.children
      : [];
  return children.reduce((total: number, child: any) => total + 1 + descendantCount(child), 0);
}

function visibleNodeList(root: any): any[] {
  if (!root) return [];
  const list: any[] = [];
  const visit = (node: any): void => {
    if (!node) return;
    list.push(node);
    if (node.getData?.('expand') === false) return;
    const children = Array.isArray(node.children) ? node.children : [];
    children.forEach(visit);
  };
  visit(root);
  return list;
}

export interface NodeQuickActionsControllerOptions {
  root: HTMLElement;
  canvas: HTMLElement;
  getRendererRoot(): any;
  getActiveNodes(): any[];
  readonly(): boolean;
  onAddChild(uid: string): void;
  onSetExpanded(uid: string, expanded: boolean): void;
}

/**
 * Hover/selection quick actions with a pointer-safe bridge between an SVG node
 * and the HTML buttons. Actions remain alive briefly while the pointer crosses
 * the small visual gap, so the controls do not disappear before they can be
 * clicked.
 */
export class NodeQuickActionsController {
  private readonly layer: HTMLElement;
  private frame = 0;
  private hideTimer: number | null = null;
  private hoveredUid: string | null = null;
  private readonly nodeElementToUid = new Map<Element, string>();

  constructor(private readonly options: NodeQuickActionsControllerOptions) {
    this.layer = document.createElement('div');
    this.layer.className = 'ymz-node-quick-actions-layer';
    this.layer.setAttribute('aria-hidden', 'false');
    this.options.root.querySelector('.ymz-canvas-wrap')?.appendChild(this.layer);
    this.layer.addEventListener('click', this.onClick);
    this.layer.addEventListener('pointerover', this.onActionPointerOver);
    this.layer.addEventListener('pointerout', this.onActionPointerOut);
    this.options.canvas.addEventListener('pointerover', this.onCanvasPointerOver);
    this.options.canvas.addEventListener('pointerout', this.onCanvasPointerOut);
  }

  destroy(): void {
    cancelAnimationFrame(this.frame);
    this.cancelHide();
    this.layer.removeEventListener('click', this.onClick);
    this.layer.removeEventListener('pointerover', this.onActionPointerOver);
    this.layer.removeEventListener('pointerout', this.onActionPointerOut);
    this.options.canvas.removeEventListener('pointerover', this.onCanvasPointerOver);
    this.options.canvas.removeEventListener('pointerout', this.onCanvasPointerOut);
    this.layer.remove();
    this.nodeElementToUid.clear();
  }

  scheduleRefresh(): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.refresh());
  }

  refresh(): void {
    this.frame = 0;
    this.layer.replaceChildren();
    this.nodeElementToUid.clear();
    if (this.options.readonly()) return;
    const rootRect = this.options.root.getBoundingClientRect();
    const activeNodes = this.options.getActiveNodes();
    visibleNodeList(this.options.getRendererRoot()).forEach((node) => {
      if (node?.isGeneralization || !node?.group?.node) return;
      const uid = String(node.getData?.('uid') ?? '');
      if (!uid) return;
      const nodeElement = node.group.node as SVGGraphicsElement;
      this.nodeElementToUid.set(nodeElement, uid);
      const rect = nodeElement.getBoundingClientRect();
      if (!rect.width && !rect.height) return;
      const selected = activeNodes.includes(node) || node.getData?.('isActive') === true;
      const hovered = this.hoveredUid === uid;
      const descriptors = describeNodeQuickActions({
        isRoot: Boolean(node.isRoot),
        childCount: descendantCount(node),
        expanded: node.getData?.('expand') !== false,
        selected,
        hovered,
      });
      if (descriptors.length === 0) return;
      const container = document.createElement('div');
      container.className = 'ymz-node-quick-actions';
      container.dataset.nodeUid = uid;
      container.dataset.quickHovered = String(hovered);
      container.style.left = `${rect.right - rootRect.left}px`;
      container.style.top = `${rect.top - rootRect.top + rect.height / 2}px`;
      descriptors.forEach((descriptor) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `ymz-node-quick-action ymz-node-quick-action--${descriptor.action}`;
        button.dataset.nodeQuickAction = descriptor.action;
        button.title = descriptor.label;
        button.setAttribute('aria-label', descriptor.label);
        button.textContent = descriptor.text;
        container.appendChild(button);
      });
      this.layer.appendChild(container);
    });
  }

  private eventNodeUid(event: PointerEvent): string | null {
    for (const item of event.composedPath()) {
      if (item instanceof Element) {
        const uid = this.nodeElementToUid.get(item);
        if (uid) return uid;
      }
    }
    return null;
  }

  private setHovered(uid: string | null): void {
    this.cancelHide();
    if (this.hoveredUid === uid) return;
    this.hoveredUid = uid;
    this.scheduleRefresh();
  }

  private scheduleHide(uid: string): void {
    this.cancelHide();
    this.hideTimer = window.setTimeout(() => {
      this.hideTimer = null;
      if (this.hoveredUid === uid) this.setHovered(null);
    }, 220);
  }

  private cancelHide(): void {
    if (this.hideTimer !== null) window.clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }

  private readonly onCanvasPointerOver = (event: PointerEvent): void => {
    const uid = this.eventNodeUid(event);
    if (uid) this.setHovered(uid);
  };

  private readonly onCanvasPointerOut = (event: PointerEvent): void => {
    const uid = this.eventNodeUid(event);
    if (!uid) return;
    const related = event.relatedTarget;
    if (related instanceof Node && (event.currentTarget as Node).contains(related)) {
      const nextUid = related instanceof Element
        ? [...this.nodeElementToUid.entries()].find(([element]) => element === related || element.contains(related))?.[1]
        : null;
      if (nextUid === uid) return;
    }
    this.scheduleHide(uid);
  };

  private readonly onActionPointerOver = (event: PointerEvent): void => {
    const host = (event.target as HTMLElement).closest<HTMLElement>('[data-node-uid]');
    const uid = host?.dataset.nodeUid;
    if (uid) this.setHovered(uid);
  };

  private readonly onActionPointerOut = (event: PointerEvent): void => {
    const host = (event.target as HTMLElement).closest<HTMLElement>('[data-node-uid]');
    const uid = host?.dataset.nodeUid;
    if (!host || !uid) return;
    const related = event.relatedTarget;
    if (related instanceof Node && host.contains(related)) return;
    this.scheduleHide(uid);
  };

  private readonly onClick = (event: MouseEvent): void => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-node-quick-action]');
    const host = button?.closest<HTMLElement>('[data-node-uid]');
    if (!button || !host) return;
    event.preventDefault();
    event.stopPropagation();
    const uid = host.dataset.nodeUid ?? '';
    if (!uid) return;
    const action = button.dataset.nodeQuickAction as NodeQuickActionName;
    if (action === 'add-child') this.options.onAddChild(uid);
    if (action === 'collapse') this.options.onSetExpanded(uid, false);
    if (action === 'expand') this.options.onSetExpanded(uid, true);
    this.setHovered(uid);
  };
}
