import { Menu, showMessage } from 'siyuan';
import { YEMIND_LAYOUT_PRESETS } from '../core/layoutPresets';
import { detectAppearance, YEMIND_THEME_PRESETS, type YeMindLineStyle } from '../core/themePresets';
import { clipartIcon, clipboardIcon, lineStyleIcon, markerIcon, nodeInsertIcon, nodeStyleIcon, outerFrameIcon, projectControlIcon, projectStyleIcon, relationIcon, summaryIcon } from '../editor/projectControls';
import type { YeMindCommands } from '../core/commands';
import {
  openCommentsDialog,
  openNoteDialog,
  openFormulaDialog,
  openImageDialog,
  openLinkDialog,
  openTagsDialog,
} from './nodeContentDialogs';
import { createNodeMenuAvailability, createTodoMenuDescriptor } from './nodeContentMenu';

export interface CanvasContextMenuOptions {
  zen: boolean;
  readonly: boolean;
  onZenChange(enabled: boolean): void;
  onReadonlyChange(enabled: boolean): void;
  currentLayout?: string;
  currentTheme?: string;
  currentLineStyle?: YeMindLineStyle;
  onLayoutChange?(layout: string): void;
  onThemeChange?(theme: string): void;
  onLineStyleChange?(lineStyle: YeMindLineStyle): void;
  onProjectStyle?(): void;
  onAction?: (action: string) => void;
}

export function openCanvasContextMenu(event: MouseEvent, commands: YeMindCommands, options: CanvasContextMenuOptions): void {
  event.preventDefault();
  event.stopPropagation();
  const menu = new Menu('siyuan-yemind-canvas-menu');
  menu.element.classList.add('ymz-context-menu', 'ymz-context-menu--canvas');
  menu.element.dataset.appearance = detectAppearance();
  const run = (action: string, callback: () => void): (() => void) => () => {
    options.onAction?.(action);
    callback();
  };
  menu.addItem({ icon: 'iconFocus', label: '定位到中心主题', click: run('center-root', () => commands.centerRoot()) });
  menu.addItem({ icon: 'iconFullscreen', label: '适配全部节点', click: run('fit', () => commands.fit()) });
  menu.addItem({ icon: 'iconRefresh', label: '重置缩放与位置', click: run('reset-view', () => commands.resetZoom()) });
  menu.addItem({ icon: 'iconAlignCenter', label: '整理布局', disabled: commands.isReadonly(), click: run('reset-layout', () => commands.resetLayout()) });
  menu.addSeparator();
  menu.addItem({
    type: 'submenu', iconHTML: projectControlIcon('layout'), label: '结构',
    submenu: YEMIND_LAYOUT_PRESETS.map((item) => ({
      label: item.label, current: item.id === options.currentLayout, disabled: commands.isReadonly(),
      click: run(`layout-${item.id}`, () => options.onLayoutChange?.(item.id)),
    })),
  });
  menu.addItem({
    type: 'submenu', iconHTML: projectControlIcon('theme'), label: '主题',
    submenu: YEMIND_THEME_PRESETS.map((item) => ({
      label: item.label, current: item.id === options.currentTheme, disabled: commands.isReadonly(),
      click: run(`theme-${item.id}`, () => options.onThemeChange?.(item.id)),
    })),
  });
  menu.addItem({
    type: 'submenu', iconHTML: lineStyleIcon(options.currentLineStyle ?? 'curve'), label: '线型',
    submenu: ([['curve', '弧线'], ['straight', '圆角折线'], ['direct', '直线']] as const).map(([id, label]) => ({
      iconHTML: lineStyleIcon(id), label, current: id === options.currentLineStyle, disabled: commands.isReadonly(),
      click: run(`line-style-${id}`, () => options.onLineStyleChange?.(id)),
    })),
  });
  menu.addItem({ iconHTML: projectStyleIcon(), label: '样式', disabled: commands.isReadonly(), click: run('project-style', () => options.onProjectStyle?.()) });
  menu.addSeparator();
  menu.addItem({ icon: 'iconRefresh', label: '展开/折叠（所有节点）', click: run('toggle-all-expand', () => commands.toggleAllExpand()) });
  menu.addSeparator();
  menu.addItem({ icon: 'iconEye', label: options.zen ? '退出禅模式' : '进入禅模式', click: run('toggle-zen', () => options.onZenChange(!options.zen)) });
  menu.addItem({ icon: 'iconLock', label: options.readonly ? '退出只读模式' : '进入只读模式', click: run('toggle-readonly', () => options.onReadonlyChange(!options.readonly)) });
  menu.open({ x: event.clientX, y: event.clientY });
}

export interface NodeContextMenuOptions {
  onInlineLink?: () => void;
  onCodeBlock?: () => void;
  onNodeLink?: () => void;
  onRelation?: () => void;
  onNodeStyle?: () => void;
  onMarkers?: () => void;
  onClipart?: () => void;
  onAction?: (action: string) => void;
}

function paste(commands: YeMindCommands, plain = false): void {
  const operation = plain ? commands.pastePlainText() : commands.paste();
  void operation.catch((error) => {
    console.error('[YeMind] node paste failed', error);
    showMessage('节点粘贴失败，请重试', 4000, 'error');
  });
}

export function openNodeContextMenu(event: MouseEvent, commands: YeMindCommands, options: NodeContextMenuOptions = {}): void {
  event.preventDefault();
  event.stopPropagation();

  const activeNodes = commands.getActiveNodes();
  const primary = commands.getPrimaryNode();
  const availability = createNodeMenuAvailability({
    readonly: commands.isReadonly(),
    primaryIsRoot: Boolean(primary?.isRoot),
    primaryIsGeneralization: Boolean(primary?.isGeneralization),
    hasRichTextSelection: commands.hasRichTextSelection(),
    hasCodeBlock: Boolean(commands.getCodeBlock()),
    canAddOuterFrame: commands.canAddOuterFrame(),
  });
  const menu = new Menu('siyuan-yemind-node-menu');
  menu.element.classList.add('ymz-context-menu', 'ymz-context-menu--node');
  menu.element.dataset.appearance = detectAppearance();
  const run = (action: string, callback: () => void): (() => void) => () => {
    options.onAction?.(action);
    callback();
  };

  if (activeNodes.length > 1) {
    menu.addItem({ iconHTML: nodeStyleIcon(), label: '节点样式', disabled: !availability.nodeContent, click: run('node-style', () => options.onNodeStyle?.()) });
    menu.addItem({ iconHTML: summaryIcon(), label: '{} 添加综合概要', accelerator: 'Ctrl+Alt+G', disabled: !availability.summary, click: run('summary-add', () => commands.addSummary()) });
    menu.addItem({ iconHTML: relationIcon(), label: '关联线', accelerator: 'Ctrl+Alt+L', disabled: !availability.relation, click: run('relation', () => options.onRelation ? options.onRelation() : commands.startRelation()) });
    menu.addItem({ icon: 'iconRefresh', label: '展开/折叠（下级节点）', disabled: !availability.toggleExpand, click: run('toggle-expand', () => commands.toggleExpand()) });
    menu.addSeparator();
    menu.addItem({ icon: 'iconCopy', label: '复制', accelerator: 'Ctrl+C', disabled: !availability.copy, click: run('copy', () => commands.copy()) });
    menu.addItem({ iconHTML: clipboardIcon('cut'), label: '剪切', accelerator: 'Ctrl+X', disabled: !availability.cut, click: run('cut', () => commands.cut()) });
    menu.addItem({ iconHTML: clipboardIcon('paste'), label: '粘贴', accelerator: 'Ctrl+V', disabled: !availability.paste, click: run('paste', () => paste(commands)) });
    menu.addItem({ iconHTML: clipboardIcon('paste'), label: '粘贴（纯文本）', accelerator: 'Ctrl+Shift+V', disabled: !availability.paste, click: run('paste-plain', () => paste(commands, true)) });
    menu.addSeparator();
    menu.addItem({ icon: 'iconTrashcan', label: '删除选中节点', accelerator: 'Shift+Backspace', warning: true, disabled: !availability.remove, click: run('remove-selected', () => commands.remove()) });
    menu.open({ x: event.clientX, y: event.clientY });
    return;
  }

  const hasOuterFrame = commands.hasOuterFrameForSelection();
  const todoAction = createTodoMenuDescriptor(commands.getTodo());
  menu.addItem({ icon: 'iconEdit', label: '编辑节点', accelerator: 'F2', disabled: !availability.edit, click: run('edit', () => commands.edit()) });
  menu.addItem({ iconHTML: nodeInsertIcon('parent'), label: '插入上级节点', accelerator: 'Shift+Tab', disabled: !availability.addParent, click: run('add-parent', () => commands.addParent()) });
  menu.addItem({ iconHTML: nodeInsertIcon('sibling'), label: '插入同级节点', accelerator: 'Enter', disabled: !availability.addSibling, click: run('add-sibling', () => commands.addSibling()) });
  menu.addItem({ iconHTML: nodeInsertIcon('child'), label: '插入下级节点', accelerator: 'Tab', disabled: !availability.addChild, click: run('add-child', () => commands.addChild()) });
  menu.addItem({
    type: 'submenu', icon: 'iconAdd', label: '添加',
    submenu: [
      { icon: 'iconCheck', label: todoAction.label, warning: todoAction.warning, disabled: !availability.nodeContent, click: run(todoAction.next === null ? 'todo-remove' : 'todo-add', () => commands.setTodo(todoAction.next)) },
      { iconHTML: outerFrameIcon(), label: hasOuterFrame ? '删除外框' : '外框', disabled: hasOuterFrame ? commands.isReadonly() : !availability.outerFrame, click: run(hasOuterFrame ? 'outer-frame-remove' : 'outer-frame-add', () => hasOuterFrame ? commands.removeOuterFrameForSelection() : commands.addOuterFrame()) },
      { icon: 'iconYeMindNote', label: '备注', disabled: !availability.nodeContent, click: run('note', () => openNoteDialog(commands)) },
      { icon: 'iconYeMindComment', label: '批注', disabled: !availability.nodeContent, click: run('comments', () => openCommentsDialog(commands)) },
      { icon: 'iconTags', label: '标签', disabled: !availability.nodeContent, click: run('tags', () => openTagsDialog(commands)) },
      { iconHTML: markerIcon(), label: '图标', disabled: !availability.nodeContent, click: run('icons', () => options.onMarkers?.()) },
      { icon: 'iconLink', label: '链接', disabled: !availability.nodeContent, click: run('node-link', () => options.onNodeLink ? options.onNodeLink() : openLinkDialog(commands)) },
      { iconHTML: clipartIcon(), label: '剪贴图', disabled: !availability.nodeContent, click: run('clipart', () => options.onClipart?.()) },
      { icon: 'iconImage', label: '图片', disabled: !availability.nodeContent, click: run('image', () => openImageDialog(commands)) },
      { icon: 'iconCode', label: '代码块', disabled: !availability.codeBlock, click: run('code-block', () => options.onCodeBlock?.()) },
      { icon: 'iconMath', label: '公式', disabled: !availability.nodeContent, click: run('formula', () => openFormulaDialog(commands)) },
      { icon: 'iconLink', label: '行内链接', disabled: !availability.inlineLink, click: run('inline-link', () => options.onInlineLink?.()) },
    ],
  });
  menu.addItem({ iconHTML: relationIcon(), label: '关联线', accelerator: 'Ctrl+Alt+L', disabled: !availability.relation, click: run('relation', () => options.onRelation ? options.onRelation() : commands.startRelation()) });
  menu.addItem({ iconHTML: nodeStyleIcon(), label: '节点样式', disabled: !availability.nodeContent, click: run('node-style', () => options.onNodeStyle?.()) });
  menu.addSeparator();
  menu.addItem({ icon: 'iconCopy', label: '复制', accelerator: 'Ctrl+C', disabled: !availability.copy, click: run('copy', () => commands.copy()) });
  menu.addItem({ iconHTML: clipboardIcon('cut'), label: '剪切', accelerator: 'Ctrl+X', disabled: !availability.cut, click: run('cut', () => commands.cut()) });
  menu.addItem({ iconHTML: clipboardIcon('paste'), label: '粘贴', accelerator: 'Ctrl+V', disabled: !availability.paste, click: run('paste', () => paste(commands)) });
  menu.addItem({ iconHTML: clipboardIcon('paste'), label: '粘贴（纯文本）', accelerator: 'Ctrl+Shift+V', disabled: !availability.paste, click: run('paste-plain', () => paste(commands, true)) });
  menu.addSeparator();
  menu.addItem({ icon: 'iconUp', label: '上移节点', accelerator: 'Ctrl+↑', disabled: !availability.move, click: run('move-up', () => commands.moveUp()) });
  menu.addItem({ icon: 'iconDown', label: '下移节点', accelerator: 'Ctrl+↓', disabled: !availability.move, click: run('move-down', () => commands.moveDown()) });
  menu.addItem({ icon: 'iconRefresh', label: '展开/折叠（下级节点）', disabled: !availability.toggleExpand, click: run('toggle-expand', () => commands.toggleExpand()) });
  menu.addSeparator();
  menu.addItem({ icon: 'iconTrashcan', label: '删除当前和子节点', accelerator: 'Delete', warning: true, disabled: !availability.remove, click: run('remove-subtree', () => commands.remove()) });
  menu.addItem({ icon: 'iconTrashcan', label: '仅删除当前', accelerator: 'Shift+Backspace', disabled: !availability.removeOnlyCurrent, click: run('remove-only-current', () => commands.removeOnlyCurrent()) });
  menu.open({ x: event.clientX, y: event.clientY });
}

export interface OutlineContextMenuOptions {
  readonly: boolean;
  isRoot: boolean;
  hasChildren: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onEdit(): void;
  onAddParent(): void;
  onAddSibling(): void;
  onAddChild(): void;
  onTextToMap(): void;
  onMarkers?(): void;
  onClipart?(): void;
  onImage?(): void;
  onCopyLine(): void | Promise<void>;
  onCutLine(): void | Promise<void>;
  onPasteAtCaret(): void | Promise<void>;
  onPastePlain(): void | Promise<void>;
  onMoveUp(): void;
  onMoveDown(): void;
  onToggleExpand(): void;
  onRemoveSubtree(): void;
  onRemoveOnlyCurrent(): void;
  onAction?: (action: string) => void;
}

function runOutlineAction(options: OutlineContextMenuOptions, action: string, callback: () => void | Promise<void>): () => void {
  return () => {
    options.onAction?.(action);
    try {
      const result = callback();
      if (result && typeof (result as Promise<void>).catch === 'function') {
        void (result as Promise<void>).catch((error) => {
          console.error(`[YeMind] outline ${action} failed`, error);
          showMessage('大纲操作失败，请重试', 4000, 'error');
        });
      }
    } catch (error) {
      console.error(`[YeMind] outline ${action} failed`, error);
      showMessage('大纲操作失败，请重试', 4000, 'error');
    }
  };
}

export function openOutlineContextMenu(event: MouseEvent, options: OutlineContextMenuOptions): void {
  event.preventDefault();
  event.stopPropagation();
  const menu = new Menu('siyuan-yemind-outline-menu');
  menu.element.classList.add('ymz-context-menu', 'ymz-context-menu--outline');
  menu.element.dataset.appearance = detectAppearance();
  const disabled = options.readonly;
  const run = (action: string, callback: () => void | Promise<void>) => runOutlineAction(options, action, callback);

  menu.addItem({ icon: 'iconEdit', label: '编辑节点', disabled, click: run('edit', options.onEdit) });
  menu.addItem({ iconHTML: nodeInsertIcon('parent'), label: '插入上级节点', disabled: disabled || options.isRoot, click: run('add-parent', options.onAddParent) });
  menu.addItem({ iconHTML: nodeInsertIcon('sibling'), label: '插入同级节点', disabled: disabled || options.isRoot, click: run('add-sibling', options.onAddSibling) });
  menu.addItem({ iconHTML: nodeInsertIcon('child'), label: '插入下级节点', disabled, click: run('add-child', options.onAddChild) });
  menu.addItem({ icon: 'iconGraph', label: '文本转导图…', disabled, click: run('text-to-map', options.onTextToMap) });
  menu.addItem({
    type: 'submenu', icon: 'iconAdd', label: '添加', disabled,
    submenu: [
      { iconHTML: markerIcon(), label: '图标', disabled, click: run('icons', () => options.onMarkers?.()) },
      { iconHTML: clipartIcon(), label: '剪贴图', disabled, click: run('clipart', () => options.onClipart?.()) },
      { icon: 'iconImage', label: '图片', disabled, click: run('image', () => options.onImage?.()) },
    ],
  });
  menu.addSeparator();
  menu.addItem({ icon: 'iconCopy', label: '复制（当前行）', click: run('copy-line', options.onCopyLine) });
  menu.addItem({ iconHTML: clipboardIcon('cut'), label: '剪切（当前行）', disabled, click: run('cut-line', options.onCutLine) });
  menu.addItem({ iconHTML: clipboardIcon('paste'), label: '粘贴（当前光标处）', disabled, click: run('paste-caret', options.onPasteAtCaret) });
  menu.addItem({ iconHTML: clipboardIcon('paste'), label: '粘贴（纯文本）', disabled, click: run('paste-plain', options.onPastePlain) });
  menu.addSeparator();
  menu.addItem({ icon: 'iconUp', label: '上移节点', disabled: disabled || !options.canMoveUp, click: run('move-up', options.onMoveUp) });
  menu.addItem({ icon: 'iconDown', label: '下移节点', disabled: disabled || !options.canMoveDown, click: run('move-down', options.onMoveDown) });
  menu.addItem({ icon: 'iconRefresh', label: '展开/折叠（下级节点）', disabled: !options.hasChildren, click: run('toggle-expand', options.onToggleExpand) });
  menu.addSeparator();
  menu.addItem({ icon: 'iconTrashcan', label: '删除当前行和子级', warning: true, disabled: disabled || options.isRoot, click: run('remove-subtree', options.onRemoveSubtree) });
  menu.addItem({ icon: 'iconTrashcan', label: '仅删除当前行', disabled: disabled || options.isRoot, click: run('remove-only-current', options.onRemoveOnlyCurrent) });
  menu.open({ x: event.clientX, y: event.clientY });
}
