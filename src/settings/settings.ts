import type { Plugin } from 'siyuan';
import type {
  CanvasMode,
  ClozeMode,
  ExternalLinkMode,
  SettingsStore,
  WheelMode,
  YeMindLayout,
} from './SettingsStore';

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

function numberElement(min: number, max: number, step: number, suffix: string, onChange: (value: number) => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'fn__flex';
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'b3-text-field fn__size100';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  const label = document.createElement('span');
  label.className = 'fn__space';
  label.textContent = suffix;
  input.addEventListener('change', () => onChange(Number(input.value)));
  wrap.append(input, label);
  Object.defineProperty(wrap, 'settingInput', { value: input });
  return wrap;
}

function inputOf(element: HTMLElement): HTMLInputElement {
  return (element as HTMLElement & { settingInput: HTMLInputElement }).settingInput;
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
  const autosave = numberElement(100, 5000, 50, '毫秒', (value) => void store.update({ autosaveDelayMs: value }));

  const richToolbar = checkboxElement((checked) => void store.update({ showRichTextToolbar: checked }));
  const autoHttps = checkboxElement((checked) => void store.update({ inlineLinkAutoHttps: checked }));
  const externalLink = selectElement<ExternalLinkMode>([
    { value: 'new-window', label: '新窗口打开' },
    { value: 'current-window', label: '当前窗口打开' },
  ], (value) => void store.update({ externalLinkMode: value }));

  const defaultCodeLanguage = selectElement<string>([
    { value: 'plain', label: '纯文本' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'bash', label: 'Bash / Shell' },
    { value: 'json', label: 'JSON' },
    { value: 'cpp', label: 'C++' },
    { value: 'rust', label: 'Rust' },
    { value: 'go', label: 'Go' },
    { value: 'sql', label: 'SQL' },
    { value: 'markdown', label: 'Markdown' },
  ], (value) => void store.update({ defaultCodeLanguage: value }));
  const codeWrap = checkboxElement((checked) => void store.update({ codeBlockWrap: checked }));
  const codeLanguage = checkboxElement((checked) => void store.update({ codeBlockShowLanguage: checked }));
  const tabSize = selectElement<'2' | '4'>([
    { value: '2', label: '2 个空格' },
    { value: '4', label: '4 个空格' },
  ], (value) => void store.update({ codeBlockTabSize: value === '4' ? 4 : 2 }));
  const codeFontSize = numberElement(10, 24, 1, 'px', (value) => void store.update({ codeBlockFontSize: value }));

  const clozeMode = selectElement<ClozeMode>([
    { value: 'hidden', label: '完全隐藏' },
    { value: 'blur', label: '模糊显示' },
  ], (value) => void store.update({ clozeMode: value }));
  const clozeHover = checkboxElement((checked) => void store.update({ clozeRevealOnHover: checked }));
  const todoBadge = checkboxElement((checked) => void store.update({ showTodoBadge: checked }));
  const commentBadge = checkboxElement((checked) => void store.update({ showCommentBadge: checked }));

  plugin.setting.addItem({ title: '默认布局', description: '新建导图默认使用的结构。', actionElement: layout });
  plugin.setting.addItem({ title: '画布拖拽习惯', description: '平移优先或框选优先。', actionElement: canvas });
  plugin.setting.addItem({ title: '滚轮行为', description: '控制画布滚轮与缩放方式。', actionElement: wheel });
  plugin.setting.addItem({ title: '显示添加子节点按钮', description: '节点选中后显示快速添加入口。', actionElement: quickCreate });
  plugin.setting.addItem({ title: '打开时适配视图', description: '打开导图后自动完整显示全部节点。', actionElement: autoFit });
  plugin.setting.addItem({ title: '自动保存延迟', description: '停止编辑后多久写入插件数据。', actionElement: autosave });

  plugin.setting.addItem({ title: '富文本选区工具栏', description: '选中文字后显示格式、链接、挖空、公式与代码工具。', actionElement: richToolbar });
  plugin.setting.addItem({ title: '裸域名自动补 HTTPS', description: '输入 example.com 时自动转换为 https://example.com。', actionElement: autoHttps });
  plugin.setting.addItem({ title: '外部链接打开方式', description: '不影响 siyuan:// 思源内部链接。', actionElement: externalLink });

  plugin.setting.addItem({ title: '默认代码语言', description: '新建代码块时预选的语言。', actionElement: defaultCodeLanguage });
  plugin.setting.addItem({ title: '代码块自动换行', description: '关闭时保留水平滚动，适合较长代码。', actionElement: codeWrap });
  plugin.setting.addItem({ title: '显示代码语言', description: '在代码块左上角显示语言标签。', actionElement: codeLanguage });
  plugin.setting.addItem({ title: '代码 Tab 宽度', description: '代码编辑器和节点代码块使用的缩进宽度。', actionElement: tabSize });
  plugin.setting.addItem({ title: '代码字号', description: '代码编辑器和节点代码块字号。', actionElement: codeFontSize });

  plugin.setting.addItem({ title: '挖空显示方式', description: '完全隐藏或保留模糊轮廓。', actionElement: clozeMode });
  plugin.setting.addItem({ title: '悬停显示挖空答案', description: '鼠标移到挖空内容上时临时显示答案。', actionElement: clozeHover });
  plugin.setting.addItem({ title: '显示待办标记', description: '在节点旁显示待办状态入口。', actionElement: todoBadge });
  plugin.setting.addItem({ title: '显示批注标记', description: '在节点旁显示批注数量入口。', actionElement: commentBadge });

  store.subscribe((settings) => {
    layout.value = settings.defaultLayout;
    canvas.value = settings.canvasMode;
    wheel.value = settings.wheelMode;
    quickCreate.checked = settings.showQuickCreate;
    autoFit.checked = settings.autoFitOnOpen;
    inputOf(autosave).value = String(settings.autosaveDelayMs);
    richToolbar.checked = settings.showRichTextToolbar;
    autoHttps.checked = settings.inlineLinkAutoHttps;
    externalLink.value = settings.externalLinkMode;
    defaultCodeLanguage.value = settings.defaultCodeLanguage;
    codeWrap.checked = settings.codeBlockWrap;
    codeLanguage.checked = settings.codeBlockShowLanguage;
    tabSize.value = String(settings.codeBlockTabSize) as '2' | '4';
    inputOf(codeFontSize).value = String(settings.codeBlockFontSize);
    clozeMode.value = settings.clozeMode;
    clozeHover.checked = settings.clozeRevealOnHover;
    todoBadge.checked = settings.showTodoBadge;
    commentBadge.checked = settings.showCommentBadge;
  });
}
