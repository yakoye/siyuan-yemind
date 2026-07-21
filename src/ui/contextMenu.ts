import { Menu } from 'siyuan';
import type { YeMindCommands } from '../core/commands';

export function openNodeContextMenu(event: MouseEvent, commands: YeMindCommands): void {
  event.preventDefault();
  event.stopPropagation();

  const menu = new Menu('siyuan-yemind-zen-node-menu');
  menu.addItem({ icon: 'iconEdit', label: '编辑节点', accelerator: 'F2', click: () => commands.edit() });
  menu.addSeparator();
  menu.addItem({ icon: 'iconAdd', label: '添加子节点', accelerator: 'Tab', click: () => commands.addChild() });
  menu.addItem({ icon: 'iconAdd', label: '添加同级节点', accelerator: 'Enter', click: () => commands.addSibling() });
  menu.addItem({ icon: 'iconAdd', label: '添加父节点', accelerator: 'Shift+Tab', click: () => commands.addParent() });
  menu.addSeparator();
  menu.addItem({ icon: 'iconUp', label: '上移节点', click: () => commands.moveUp() });
  menu.addItem({ icon: 'iconDown', label: '下移节点', click: () => commands.moveDown() });
  menu.addItem({ icon: 'iconRefresh', label: '展开/折叠', accelerator: '/', click: () => commands.toggleExpand() });
  menu.addSeparator();
  menu.addItem({ icon: 'iconTrashcan', label: '仅删除节点，保留子节点', accelerator: 'Shift+Backspace', click: () => commands.removeOnlyCurrent() });
  menu.addItem({ icon: 'iconTrashcan', label: '删除节点和子树', accelerator: 'Backspace', warning: true, click: () => commands.remove() });
  menu.open({ x: event.clientX, y: event.clientY });
}
