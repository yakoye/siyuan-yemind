import { Menu, showMessage } from 'siyuan';
import type { YeMindCommands } from '../core/commands';
import {
  openCommentsDialog,
  openFormulaDialog,
  openIconsDialog,
  openImageDialog,
  openLinkDialog,
  openTagsDialog,
} from './nodeContentDialogs';
import { createNodeMenuAvailability, createSummaryMenuDescriptor, createTodoMenuDescriptor } from './nodeContentMenu';

export interface NodeContextMenuOptions {
  onInlineLink?: () => void;
  onCodeBlock?: () => void;
  onNodeLink?: () => void;
  onRelation?: () => void;
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
  menu.addItem({ icon: 'iconEdit', label: '编辑节点', accelerator: 'F2', disabled: !availability.edit, click: () => commands.edit() });
  menu.addSeparator();
  menu.addItem({ icon: 'iconAdd', label: '添加子节点', accelerator: 'Tab', disabled: !availability.addChild, click: () => commands.addChild() });
  menu.addItem({ icon: 'iconAdd', label: '添加同级节点', accelerator: 'Enter', disabled: !availability.addSibling, click: () => commands.addSibling() });
  menu.addItem({ icon: 'iconAdd', label: '添加父节点', accelerator: 'Alt+Enter', disabled: !availability.addParent, click: () => commands.addParent() });
  menu.addSeparator();
  menu.addItem({ icon: 'iconCopy', label: '复制节点子树', accelerator: 'Ctrl+C', disabled: !availability.copy, click: () => commands.copy() });
  menu.addItem({ label: '剪切节点子树', accelerator: 'Ctrl+X', disabled: !availability.cut, click: () => commands.cut() });
  menu.addItem({ label: '粘贴节点子树', accelerator: 'Ctrl+V', disabled: !availability.paste, click: () => {
    void commands.paste().catch((error) => {
      console.error('[YeMind Zen] node paste failed', error);
      showMessage('节点粘贴失败，请重试', 4000, 'error');
    });
  } });
  menu.addSeparator();
  const todoAction = createTodoMenuDescriptor(commands.getTodo());
  menu.addItem({ icon: 'iconCheck', label: todoAction.label, warning: todoAction.warning, disabled: !availability.nodeContent, click: () => commands.setTodo(todoAction.next) });
  menu.addItem({ icon: 'iconMessage', label: '批注', disabled: !availability.nodeContent, click: () => openCommentsDialog(commands) });
  menu.addItem({ icon: 'iconTags', label: '标签', disabled: !availability.nodeContent, click: () => openTagsDialog(commands) });
  menu.addItem({ icon: 'iconEmoji', label: '图标', disabled: !availability.nodeContent, click: () => openIconsDialog(commands) });
  menu.addItem({ icon: 'iconLink', label: '链接', disabled: !availability.nodeContent, click: () => options.onNodeLink ? options.onNodeLink() : openLinkDialog(commands) });
  menu.addItem({ icon: 'iconImage', label: '图片', disabled: !availability.nodeContent, click: () => openImageDialog(commands) });
  menu.addItem({ icon: 'iconMath', label: '公式', disabled: !availability.nodeContent, click: () => openFormulaDialog(commands) });
  menu.addItem({ icon: 'iconLink', label: '行内链接', disabled: !availability.inlineLink, click: () => options.onInlineLink?.() });
  menu.addItem({ icon: 'iconCode', label: '代码块', disabled: !availability.codeBlock, click: () => options.onCodeBlock?.() });
  menu.addSeparator();
  const summaryAction = createSummaryMenuDescriptor(commands.getActiveNodes());
  menu.addItem({
    icon: 'iconList',
    label: summaryAction.label,
    accelerator: summaryAction.action === 'add' ? 'Ctrl+Alt+G' : undefined,
    warning: summaryAction.warning,
    disabled: !availability.summary,
    click: () => summaryAction.action === 'add' ? commands.addSummary() : commands.removeSummary(),
  });
  menu.addItem({ icon: 'iconSelect', label: '添加外框', disabled: !availability.outerFrame, click: () => commands.addOuterFrame() });
  menu.addItem({ icon: 'iconRight', label: '关联线', accelerator: 'Ctrl+Alt+L', disabled: !availability.relation, click: () => options.onRelation ? options.onRelation() : commands.startRelation() });
  menu.addSeparator();
  menu.addItem({ icon: 'iconUp', label: '上移节点', disabled: !availability.move, click: () => commands.moveUp() });
  menu.addItem({ icon: 'iconDown', label: '下移节点', disabled: !availability.move, click: () => commands.moveDown() });
  menu.addItem({ icon: 'iconRefresh', label: '展开/折叠', accelerator: '/', disabled: !availability.toggleExpand, click: () => commands.toggleExpand() });
  menu.addItem({ icon: 'iconAlignCenter', label: '整理布局', disabled: !availability.resetLayout, click: () => commands.resetLayout() });
  menu.addSeparator();
  menu.addItem({ icon: 'iconTrashcan', label: '仅删除节点，保留子节点', accelerator: 'Shift+Backspace', disabled: !availability.removeOnlyCurrent, click: () => commands.removeOnlyCurrent() });
  menu.addItem({ icon: 'iconTrashcan', label: '删除节点和子树', accelerator: 'Backspace', warning: true, disabled: !availability.remove, click: () => commands.remove() });
  menu.open({ x: event.clientX, y: event.clientY });
}
