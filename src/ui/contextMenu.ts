import { Menu } from 'siyuan';
import type { YeMindCommands } from '../core/commands';
import {
  openCommentsDialog,
  openFormulaDialog,
  openIconsDialog,
  openImageDialog,
  openLinkDialog,
  openNoteDialog,
  openTagsDialog,
  openTodoDialog,
} from './nodeContentDialogs';

export function openNodeContextMenu(event: MouseEvent, commands: YeMindCommands): void {
  event.preventDefault();
  event.stopPropagation();

  const menu = new Menu('siyuan-yemind-zen-node-menu');
  menu.addItem({ icon: 'iconEdit', label: '编辑节点', accelerator: 'F2', click: () => commands.edit() });
  menu.addSeparator();
  menu.addItem({ icon: 'iconAdd', label: '添加子节点', accelerator: 'Tab', click: () => commands.addChild() });
  menu.addItem({ icon: 'iconAdd', label: '添加同级节点', accelerator: 'Enter', click: () => commands.addSibling() });
  menu.addItem({ icon: 'iconAdd', label: '添加父节点', accelerator: 'Alt+Enter', click: () => commands.addParent() });
  menu.addSeparator();
  menu.addItem({ icon: 'iconCheck', label: '待办', click: () => openTodoDialog(commands) });
  menu.addItem({ icon: 'iconMessage', label: '批注', click: () => openCommentsDialog(commands) });
  menu.addItem({ icon: 'iconInfo', label: '备注', click: () => openNoteDialog(commands) });
  menu.addItem({ icon: 'iconTags', label: '标签', click: () => openTagsDialog(commands) });
  menu.addItem({ icon: 'iconEmoji', label: '图标', click: () => openIconsDialog(commands) });
  menu.addItem({ icon: 'iconLink', label: '链接', click: () => openLinkDialog(commands) });
  menu.addItem({ icon: 'iconImage', label: '图片', click: () => openImageDialog(commands) });
  menu.addItem({ icon: 'iconMath', label: '公式', click: () => openFormulaDialog(commands) });
  menu.addSeparator();
  menu.addItem({ icon: 'iconList', label: '概要', accelerator: 'Ctrl+Alt+G', click: () => commands.addSummary() });
  menu.addItem({ icon: 'iconRight', label: '关联线', accelerator: 'Ctrl+Alt+L', click: () => commands.startRelation() });
  menu.addSeparator();
  menu.addItem({ icon: 'iconUp', label: '上移节点', click: () => commands.moveUp() });
  menu.addItem({ icon: 'iconDown', label: '下移节点', click: () => commands.moveDown() });
  menu.addItem({ icon: 'iconRefresh', label: '展开/折叠', accelerator: '/', click: () => commands.toggleExpand() });
  menu.addSeparator();
  menu.addItem({ icon: 'iconTrashcan', label: '仅删除节点，保留子节点', accelerator: 'Shift+Backspace', click: () => commands.removeOnlyCurrent() });
  menu.addItem({ icon: 'iconTrashcan', label: '删除节点和子树', accelerator: 'Backspace', warning: true, click: () => commands.remove() });
  menu.open({ x: event.clientX, y: event.clientY });
}
