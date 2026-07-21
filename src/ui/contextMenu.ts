import { Menu, showMessage } from 'siyuan';
import { YEMIND_LAYOUT_PRESETS } from '../core/layoutPresets';
import { YEMIND_THEME_PRESETS, type YeMindLineStyle } from '../core/themePresets';
import { clipboardIcon, lineStyleIcon, nodeStyleIcon, projectControlIcon, projectStyleIcon, summaryIcon } from '../editor/projectControls';
import type { YeMindCommands } from '../core/commands';
import {
  openCommentsDialog,
  openNoteDialog,
  openFormulaDialog,
  openIconsDialog,
  openImageDialog,
  openLinkDialog,
  openTagsDialog,
} from './nodeContentDialogs';
import { createNodeMenuAvailability, createSummaryMenuDescriptor, createTodoMenuDescriptor } from './nodeContentMenu';

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
  const menu = new Menu('siyuan-yemind-zen-canvas-menu');
  menu.element.classList.add('ymz-context-menu', 'ymz-context-menu--canvas');
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
    type: 'submenu',
    iconHTML: projectControlIcon('layout'),
    label: '结构',
    submenu: YEMIND_LAYOUT_PRESETS.map((item) => ({
      label: item.label,
      current: item.id === options.currentLayout,
      disabled: commands.isReadonly(),
      click: run(`layout-${item.id}`, () => options.onLayoutChange?.(item.id)),
    })),
  });
  menu.addItem({
    type: 'submenu',
    iconHTML: projectControlIcon('theme'),
    label: '主题',
    submenu: YEMIND_THEME_PRESETS.map((item) => ({
      label: item.label,
      current: item.id === options.currentTheme,
      disabled: commands.isReadonly(),
      click: run(`theme-${item.id}`, () => options.onThemeChange?.(item.id)),
    })),
  });
  menu.addItem({
    type: 'submenu',
    iconHTML: lineStyleIcon(options.currentLineStyle ?? 'curve'),
    label: '线型',
    submenu: ([
      ['curve', '弧线'],
      ['straight', '圆角折线'],
      ['direct', '直线'],
    ] as const).map(([id, label]) => ({
      iconHTML: lineStyleIcon(id),
      label,
      current: id === options.currentLineStyle,
      disabled: commands.isReadonly(),
      click: run(`line-style-${id}`, () => options.onLineStyleChange?.(id)),
    })),
  });
  menu.addItem({
    iconHTML: projectStyleIcon(),
    label: '样式',
    disabled: commands.isReadonly(),
    click: run('project-style', () => options.onProjectStyle?.()),
  });
  menu.addSeparator();
  menu.addItem({ icon: 'iconDown', label: '展开全部节点', click: run('expand-all', () => commands.expandAll()) });
  menu.addItem({ icon: 'iconUp', label: '折叠全部节点', click: run('collapse-all', () => commands.collapseAll()) });
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
  onAction?: (action: string) => void;
}

export function openNodeContextMenu(event: MouseEvent, commands: YeMindCommands, options: NodeContextMenuOptions = {}): void {
  event.preventDefault();
  event.stopPropagation();

  const primary = commands.getPrimaryNode();
  const availability = createNodeMenuAvailability({
    readonly: commands.isReadonly(),
    primaryIsRoot: Boolean(primary?.isRoot),
    primaryIsGeneralization: Boolean(primary?.isGeneralization),
    hasRichTextSelection: commands.hasRichTextSelection(),
    hasCodeBlock: Boolean(commands.getCodeBlock()),
    canAddOuterFrame: commands.canAddOuterFrame(),
  });

  const menu = new Menu('siyuan-yemind-zen-node-menu');
  menu.element.classList.add('ymz-context-menu', 'ymz-context-menu--node');
  const run = (action: string, callback: () => void): (() => void) => () => {
    options.onAction?.(action);
    callback();
  };

  menu.addItem({ icon: 'iconEdit', label: '编辑节点', accelerator: 'F2', disabled: !availability.edit, click: run('edit', () => commands.edit()) });
  menu.addSeparator();
  menu.addItem({ icon: 'iconAdd', label: '添加子节点', accelerator: 'Tab', disabled: !availability.addChild, click: run('add-child', () => commands.addChild()) });
  menu.addItem({ icon: 'iconAdd', label: '添加同级节点', accelerator: 'Enter', disabled: !availability.addSibling, click: run('add-sibling', () => commands.addSibling()) });
  menu.addItem({ icon: 'iconAdd', label: '添加父节点', accelerator: 'Alt+Enter', disabled: !availability.addParent, click: run('add-parent', () => commands.addParent()) });
  menu.addSeparator();

  menu.addItem({
    type: 'submenu',
    iconHTML: clipboardIcon('copy'),
    label: '剪贴板',
    submenu: [
      { iconHTML: clipboardIcon('copy'), label: '复制节点子树', accelerator: 'Ctrl+C', disabled: !availability.copy, click: run('copy', () => commands.copy()) },
      { iconHTML: clipboardIcon('cut'), label: '剪切节点子树', accelerator: 'Ctrl+X', disabled: !availability.cut, click: run('cut', () => commands.cut()) },
      { iconHTML: clipboardIcon('paste'), label: '粘贴节点子树', accelerator: 'Ctrl+V', disabled: !availability.paste, click: run('paste', () => {
        void commands.paste().catch((error) => {
          console.error('[YeMind Zen] node paste failed', error);
          showMessage('节点粘贴失败，请重试', 4000, 'error');
        });
      }) },
    ],
  });

  const todoAction = createTodoMenuDescriptor(commands.getTodo());
  menu.addItem({
    type: 'submenu',
    icon: 'iconMenu',
    label: '节点内容',
    submenu: [
      { icon: 'iconCheck', label: todoAction.label, warning: todoAction.warning, disabled: !availability.nodeContent, click: run(todoAction.next === null ? 'todo-remove' : 'todo-add', () => commands.setTodo(todoAction.next)) },
      { icon: 'iconYeMindNote', label: '备注', disabled: !availability.nodeContent, click: run('note', () => openNoteDialog(commands)) },
      { icon: 'iconYeMindComment', label: '批注', disabled: !availability.nodeContent, click: run('comments', () => openCommentsDialog(commands)) },
      { icon: 'iconTags', label: '标签', disabled: !availability.nodeContent, click: run('tags', () => openTagsDialog(commands)) },
      { icon: 'iconEmoji', label: '图标', disabled: !availability.nodeContent, click: run('icons', () => openIconsDialog(commands)) },
      { icon: 'iconLink', label: '链接', disabled: !availability.nodeContent, click: run('node-link', () => options.onNodeLink ? options.onNodeLink() : openLinkDialog(commands)) },
      { icon: 'iconImage', label: '图片', disabled: !availability.nodeContent, click: run('image', () => openImageDialog(commands)) },
      { icon: 'iconMath', label: '公式', disabled: !availability.nodeContent, click: run('formula', () => openFormulaDialog(commands)) },
      { icon: 'iconLink', label: '行内链接', disabled: !availability.inlineLink, click: run('inline-link', () => options.onInlineLink?.()) },
      { icon: 'iconCode', label: '代码块', disabled: !availability.codeBlock, click: run('code-block', () => options.onCodeBlock?.()) },
    ],
  });

  const summaryAction = createSummaryMenuDescriptor(commands.getActiveNodes());
  menu.addItem({
    type: 'submenu',
    iconHTML: nodeStyleIcon(),
    label: '样式与关系',
    submenu: [
      { iconHTML: nodeStyleIcon(), label: '节点样式', disabled: !availability.nodeContent, click: run('node-style', () => options.onNodeStyle?.()) },
      {
        iconHTML: summaryIcon(),
        label: summaryAction.label,
        accelerator: summaryAction.action === 'add' ? 'Ctrl+Alt+G' : undefined,
        warning: summaryAction.warning,
        disabled: !availability.summary,
        click: run(`summary-${summaryAction.action}`, () => summaryAction.action === 'add' ? commands.addSummary() : commands.removeSummary()),
      },
      { icon: 'iconSelect', label: '添加外框', disabled: !availability.outerFrame, click: run('outer-frame', () => commands.addOuterFrame()) },
      { icon: 'iconRight', label: '关联线', accelerator: 'Ctrl+Alt+L', disabled: !availability.relation, click: run('relation', () => options.onRelation ? options.onRelation() : commands.startRelation()) },
    ],
  });

  menu.addItem({
    type: 'submenu',
    icon: 'iconAlignCenter',
    label: '排列与折叠',
    submenu: [
      { icon: 'iconUp', label: '上移节点', disabled: !availability.move, click: run('move-up', () => commands.moveUp()) },
      { icon: 'iconDown', label: '下移节点', disabled: !availability.move, click: run('move-down', () => commands.moveDown()) },
      { icon: 'iconRefresh', label: '展开/折叠', accelerator: '/', disabled: !availability.toggleExpand, click: run('toggle-expand', () => commands.toggleExpand()) },
      { icon: 'iconAlignCenter', label: '整理布局', disabled: !availability.resetLayout, click: run('reset-layout', () => commands.resetLayout()) },
    ],
  });

  menu.addSeparator();
  menu.addItem({ icon: 'iconTrashcan', label: '仅删除节点，保留子节点', accelerator: 'Shift+Backspace', disabled: !availability.removeOnlyCurrent, click: run('remove-only-current', () => commands.removeOnlyCurrent()) });
  menu.addItem({ icon: 'iconTrashcan', label: '删除节点和子树', accelerator: 'Backspace', warning: true, disabled: !availability.remove, click: run('remove-subtree', () => commands.remove()) });
  menu.open({ x: event.clientX, y: event.clientY });
}

