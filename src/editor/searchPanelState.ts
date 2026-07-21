export function setSearchReplaceExpanded(panel: HTMLElement, expanded: boolean): void {
  panel.dataset.replaceExpanded = String(expanded);
  const row = panel.querySelector<HTMLElement>('[data-role="replace-row"]');
  if (row) row.hidden = !expanded;
  const button = panel.querySelector<HTMLElement>('[data-search-action="toggle-replace"]');
  if (!button) return;
  button.textContent = expanded ? '⌄' : '›';
  button.setAttribute('aria-expanded', String(expanded));
  button.setAttribute('title', expanded ? '收起替换' : '展开替换');
  button.setAttribute('aria-label', expanded ? '收起替换' : '展开替换');
}
