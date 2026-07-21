import type { Plugin } from 'siyuan';
import type { SettingsStore, YeMindLayout, CanvasMode, WheelMode } from './SettingsStore';

function selectElement<T extends string>(options: Array<{ value: T; label: string }>, onChange: (value: T) => void): HTMLSelectElement {
  const select = document.createElement('select');
  select.className = 'b3-select fn__size200';
  options.forEach(({ value, label }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });
  select.addEventListener('change', () => onChange(select.value as T));
  return select;
}

function checkboxElement(onChange: (checked: boolean) => void): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'b3-switch';
  input.addEventListener('change', () => onChange(input.checked));
  return input;
}

export function registerSettings(plugin: Plugin, store: SettingsStore): void {
  const layout = selectElement<YeMindLayout>([
    { value: 'logicalStructure', label: '向右逻辑图' },
    { value: 'logicalStructureLeft', label: '向左逻辑图' },
    { value: 'mindMap', label: '双向思维导图' },
    { value: 'organizationStructure', label: '组织结构图' },
    { value: 'catalogOrganization', label: '目录组织图' },
  ], (value) => void store.update({ defaultLayout: value }));
  const canvas = selectElement<CanvasMode>([
    { value: 'pan', label: '平移优先' },
    { value: 'select', label: '选择优先' },
  ], (value) => void store.update({ canvasMode: value }));
  const wheel = selectElement<WheelMode>([
    { value: 'pan', label: '滚轮平移，Ctrl/Cmd 缩放' },
    { value: 'zoom', label: '直接缩放' },
    { value: 'none', label: '关闭滚轮缩放' },
  ], (value) => void store.update({ wheelMode: value }));
  const quickCreate = checkboxElement((checked) => void store.update({ showQuickCreate: checked }));
  const autoFit = checkboxElement((checked) => void store.update({ autoFitOnOpen: checked }));

  plugin.setting.addItem({ title: '默认布局', description: '新建导图默认使用的结构。', actionElement: layout });
  plugin.setting.addItem({ title: '画布拖拽习惯', description: '平移优先或框选优先。', actionElement: canvas });
  plugin.setting.addItem({ title: '滚轮行为', description: '控制画布滚轮与缩放方式。', actionElement: wheel });
  plugin.setting.addItem({ title: '显示添加子节点按钮', description: '节点选中后显示快速添加入口。', actionElement: quickCreate });
  plugin.setting.addItem({ title: '打开时适配视图', description: '打开导图后自动完整显示全部节点。', actionElement: autoFit });

  store.subscribe((settings) => {
    layout.value = settings.defaultLayout;
    canvas.value = settings.canvasMode;
    wheel.value = settings.wheelMode;
    quickCreate.checked = settings.showQuickCreate;
    autoFit.checked = settings.autoFitOnOpen;
  });
}
