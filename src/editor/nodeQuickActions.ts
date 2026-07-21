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
}

export function describeNodeQuickActions(state: NodeQuickActionState): NodeQuickActionDescriptor[] {
  const childCount = Math.max(0, Math.trunc(Number(state.childCount) || 0));
  if (childCount > 0 && !state.expanded) {
    return [{
      action: 'expand',
      label: `展开 ${childCount} 个子孙节点`,
      text: String(childCount),
    }];
  }
  if (!state.selected) return [];
  const actions: NodeQuickActionDescriptor[] = [];
  if (childCount > 0) {
    actions.push({
      action: 'collapse',
      label: `折叠 ${childCount} 个子孙节点`,
      text: '−',
    });
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
    const expanded = node.getData?.('expand') !== false;
    if (!expanded) return;
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

export class NodeQuickActionsController {
  private readonly layer: HTMLElement;
  private frame = 0;

  constructor(private readonly options: NodeQuickActionsControllerOptions) {
    this.layer = document.createElement('div');
    this.layer.className = 'ymz-node-quick-actions-layer';
    this.layer.setAttribute('aria-hidden', 'false');
    this.options.root.querySelector('.ymz-canvas-wrap')?.appendChild(this.layer);
    this.layer.addEventListener('click', this.onClick);
  }

  destroy(): void {
    cancelAnimationFrame(this.frame);
    this.layer.removeEventListener('click', this.onClick);
    this.layer.remove();
  }

  scheduleRefresh(): void {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.refresh());
  }

  refresh(): void {
    this.frame = 0;
    this.layer.replaceChildren();
    if (this.options.readonly()) return;
    const rootRect = this.options.root.getBoundingClientRect();
    visibleNodeList(this.options.getRendererRoot()).forEach((node) => {
      if (node?.isGeneralization || !node?.group?.node) return;
      const uid = String(node.getData?.('uid') ?? '');
      if (!uid) return;
      const rect = (node.group.node as SVGGraphicsElement).getBoundingClientRect();
      if (!rect.width && !rect.height) return;
      const childCount = descendantCount(node);
      const expanded = node.getData?.('expand') !== false;
      const selected = this.options.getActiveNodes().includes(node)
        || node.getData?.('isActive') === true;
      const descriptors = describeNodeQuickActions({
        isRoot: Boolean(node.isRoot),
        childCount,
        expanded,
        selected,
      });
      if (descriptors.length === 0) return;
      const container = document.createElement('div');
      container.className = 'ymz-node-quick-actions';
      container.dataset.nodeUid = uid;
      container.style.left = `${rect.right - rootRect.left + 5}px`;
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
  };
}
