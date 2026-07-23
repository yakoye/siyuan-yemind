const LEGACY_DEFAULT_NODE_TEXTS = new Set([
  '新节点',
  '中心主题',
  '主要主题',
  '另一个主题',
  '未命名导图',
]);

function plainText(value: unknown): string {
  const text = String(value ?? '');
  if (!/[<&]/.test(text)) return text.replace(/\u00a0/g, ' ').trim();
  const host = document.createElement('div');
  host.innerHTML = text;
  return (host.textContent ?? '').replace(/\u00a0/g, ' ').trim();
}

export function isPristineNodeTextData(data: Record<string, unknown> | null | undefined): boolean {
  if (!data) return false;
  if (data.yemindTextEdited === true) return false;
  if (data.yemindTextPristine === true) return true;
  return LEGACY_DEFAULT_NODE_TEXTS.has(plainText(data.text));
}

export function markNodeTextEditedData(data: Record<string, unknown> | null | undefined): void {
  if (!data) return;
  data.yemindTextPristine = false;
  data.yemindTextEdited = true;
}

export function pristineNodeData<T extends Record<string, unknown>>(data: T): T {
  return {
    ...data,
    yemindTextPristine: true,
    yemindTextEdited: false,
  };
}

export function editableTextLength(quill: { getLength(): number }): number {
  return Math.max(0, Number(quill.getLength?.() ?? 0) - 1);
}
