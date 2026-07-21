import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';
import { densitySpacing } from '../../../src/editor/projectStyle';
import { mountGlobalSearchResults } from '../../../src/plugin/globalSearch';

const maps = [{
  id: 'map-1', title: 'PCIe 学习', createdAt: 1, updatedAt: 1,
  layout: 'logicalStructure', theme: 'yemind-default', lineStyle: 'curve' as const,
  data: { data: { uid: 'root', text: 'PCIe Root' }, children: [
    { data: { uid: 'ats', text: 'ATS 地址转换' }, children: [] },
  ] },
}];

describe('v0.6.6 compact style panel and dependable search opening', () => {
  it('uses the requested compact spacing and shifts the previous presets forward', () => {
    expect(densitySpacing('compact')).toEqual({
      second: { marginX: 30, marginY: 2 },
      node: { marginX: 30, marginY: 2 },
    });
    expect(densitySpacing('default')).toEqual({
      second: { marginX: 60, marginY: 14 },
      node: { marginX: 28, marginY: 6 },
    });
    expect(densitySpacing('comfortable')).toEqual({
      second: { marginX: 82, marginY: 22 },
      node: { marginX: 42, marginY: 11 },
    });
  });

  it('renders a narrow minimal style panel without density subtitles', () => {
    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('Demo');
    const panel = host.querySelector<HTMLElement>('[data-role="project-style-panel"]')!;
    expect(panel.querySelectorAll('.ymz-density-options small')).toHaveLength(0);
    expect(panel.querySelectorAll(':scope > section > p')).toHaveLength(0);
    expect(panel.textContent).not.toContain('应用到整张导图的所有节点');
    expect(panel.textContent).not.toContain('最小化分支间距');
    expect(panel.textContent).not.toContain('原紧凑间距');
    expect(panel.textContent).not.toContain('主题原始间距');

    const css = readFileSync('src/styles/index.css', 'utf8');
    expect(css).toMatch(/\.ymz-project-style-panel\{[^}]*width:min\(220px,/s);
    expect(css).toContain('.ymz-density-options button{min-height:40px');
  });

  it('opens a global result on primary mousedown before host search blur can remove it', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="search__layout"><input value="ATS"></div>';
    document.body.appendChild(root);
    const onOpen = vi.fn();
    mountGlobalSearchResults({ searchElement: root.querySelector('input')!, maps, onOpen });
    const result = root.querySelector<HTMLElement>('[data-yemind-global-node="ats"]')!;
    result.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
    expect(onOpen).not.toHaveBeenCalled();
    expect(result.classList.contains('b3-list-item--focus')).toBe(true);
    result.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, button: 0 }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith('map-1', 'ats');
    root.remove();
  });

  it('uses the four-corner focus icon for fit view', () => {
    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('Demo');
    const fit = host.querySelector<HTMLElement>('.ymz-statusbar [data-action="fit"]')!;
    expect(fit.querySelector('svg.ymz-icon-fit-view')).not.toBeNull();
    expect(fit.textContent?.trim()).toBe('');
  });
});
