export function hasImageFile(dataTransfer: Pick<DataTransfer, 'items' | 'files'> | null | undefined): boolean {
  if (!dataTransfer) return false;
  if (Array.from(dataTransfer.items ?? []).some((item) => item.kind === 'file' && item.type.toLowerCase().startsWith('image/'))) {
    return true;
  }
  return Array.from(dataTransfer.files ?? []).some((file) => file.type.toLowerCase().startsWith('image/'));
}

export function extractImageFile(dataTransfer: Pick<DataTransfer, 'items' | 'files'> | null | undefined): File | null {
  if (!dataTransfer) return null;
  for (const item of Array.from(dataTransfer.items ?? [])) {
    if (item.kind !== 'file') continue;
    const file = item.getAsFile();
    if (file?.type.toLowerCase().startsWith('image/')) return file;
  }
  return Array.from(dataTransfer.files ?? []).find((file) => file.type.toLowerCase().startsWith('image/')) ?? null;
}

function renderedChildren(node: any): any[] {
  const children = Array.isArray(node?.children) ? node.children : [];
  const generalizations = Array.isArray(node?._generalizationList)
    ? node._generalizationList.map((item: any) => item?.generalizationNode).filter(Boolean)
    : [];
  return [...children, ...generalizations];
}

export function findRenderedNodeAtClientPoint(mindMap: any, clientX: number, clientY: number): any | null {
  const root = mindMap?.renderer?.root;
  if (!root || typeof mindMap?.toPos !== 'function') return null;
  const local = mindMap.toPos(clientX, clientY);
  const transform = mindMap?.draw?.transform?.() ?? {};
  const scaleX = Number(transform.scaleX) || 1;
  const scaleY = Number(transform.scaleY) || 1;
  const mapX = (Number(local.x) - (Number(transform.translateX) || 0)) / scaleX;
  const mapY = (Number(local.y) - (Number(transform.translateY) || 0)) / scaleY;

  let match: any | null = null;
  const visit = (node: any): void => {
    const left = Number(node?.left);
    const top = Number(node?.top);
    const width = Number(node?.width);
    const height = Number(node?.height);
    if ([left, top, width, height].every(Number.isFinite)
      && mapX >= left && mapX <= left + width
      && mapY >= top && mapY <= top + height) match = node;
    renderedChildren(node).forEach(visit);
  };
  visit(root);
  return match;
}
