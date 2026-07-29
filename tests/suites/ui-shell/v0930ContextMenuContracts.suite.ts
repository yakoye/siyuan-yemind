import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SymbolPicker } from '../../../src/ui/symbolPicker';
import { SYMBOL_SECTIONS } from '../../../src/content/symbolCatalog';

const contextMenu = readFileSync(resolve(process.cwd(), 'src/ui/contextMenu.ts'), 'utf8');
const editor = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
const projectControls = readFileSync(resolve(process.cwd(), 'src/editor/projectControls.ts'), 'utf8');

describe('v0.9.30 context menu contracts', () => {
  it('places text-to-map immediately before the single-node 添加 submenu', () => {
    const textIndex = contextMenu.indexOf("label: '文本转导图…'");
    const addIndex = contextMenu.indexOf("type: 'submenu', icon: 'iconAdd', label: '添加'");
    expect(textIndex).toBeGreaterThan(0);
    expect(addIndex).toBeGreaterThan(textIndex);
    expect(editor).toContain('onTextToMap: () => this.openTextToMapForUid');
    expect(editor).toContain('private openTextToMapForUid');
    expect(editor).toContain('openTextToMapDialog({');
  });

  it('uses one reversible expansion command per scope', () => {
    expect(contextMenu).toContain("label: '展开/折叠全部下级节点'");
    expect(contextMenu).toContain("label: '展开/折叠全部节点'");
    expect(contextMenu).toContain('commands.toggleBranchExpandByUid(uid)');
    expect(contextMenu).toContain('commands.toggleAllExpand()');
  });

  it('keeps the stateful card action inside 添加 without a duplicated plus prefix', () => {
    expect(contextMenu).toContain("label: options.hasCard ? '删除卡片' : '添加到卡片'");
    expect(contextMenu).toContain('iconHTML: cardMenuIcon()');
    expect(contextMenu).toContain('warning: Boolean(options.hasCard)');
    expect(contextMenu).not.toContain("type: 'submenu', icon: 'iconGrid', label: '卡片'");
    expect(contextMenu).not.toContain("label: '＋ 当前节点'");
    expect(contextMenu.indexOf("label: options.hasCard ? '删除卡片' : '添加到卡片'"))
      .toBeLessThan(contextMenu.indexOf('label: todoAction.label'));
  });

  it('places the Ω symbol action immediately above 图标 in both add submenus', () => {
    const matches = [...contextMenu.matchAll(/label: '符号'/g)];
    expect(matches).toHaveLength(2);
    matches.forEach((match) => {
      const tail = contextMenu.slice(match.index, match.index! + 320);
      expect(tail.indexOf("label: '图标'")).toBeGreaterThan(0);
    });
    expect(contextMenu).toContain('iconHTML: symbolIcon()');
    expect(projectControls).toContain('ymz-icon-slot--menu');
    expect(projectControls).toContain('class="ymz-menu-icon ymz-icon-symbol"');
    expect(SYMBOL_SECTIONS.map((section) => section.label)).toEqual([
      '箭头', '形状', '数字', '括号', '汉字结构', '数学',
    ]);
  });

  it('keeps the symbol dialog open on outside clicks and closes only from its close control', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    let canInsert = false;
    const picker = new SymbolPicker(root, {
      canInsert: () => canInsert,
      onInsert: () => true,
    });
    canInsert = true;
    picker.show();
    const dialog = root.querySelector<HTMLElement>('.ymz-symbol-picker')!;
    expect(dialog.querySelector<HTMLButtonElement>('[data-symbol-value="Ω"]')?.disabled).toBe(false);
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(dialog.hidden).toBe(false);
    dialog.querySelector<HTMLButtonElement>('[data-symbol-action="close"]')!.click();
    expect(dialog.hidden).toBe(true);
    picker.destroy();
    root.remove();
  });

  it('keeps semantic empty cells and renders symbol groups as layout cards', () => {
    const basicDirections = SYMBOL_SECTIONS
      .flatMap((section) => section.groups)
      .find((group) => group.id === 'basic-directions');
    const circledNumbers = SYMBOL_SECTIONS
      .flatMap((section) => section.groups)
      .find((group) => group.id === 'circled-numbers');
    expect(basicDirections).toMatchObject({ layout: 'spatial', columns: 3 });
    expect(basicDirections?.cells).toHaveLength(9);
    expect(basicDirections?.cells[4]).toBeNull();
    expect(circledNumbers).toMatchObject({ layout: 'number-pad', columns: 3 });
    expect(circledNumbers?.cells).toHaveLength(12);

    const root = document.createElement('div');
    document.body.append(root);
    const picker = new SymbolPicker(root, { canInsert: () => true, onInsert: () => true });
    picker.show();
    const dialog = root.querySelector<HTMLElement>('.ymz-symbol-picker')!;
    expect(dialog.querySelectorAll('.ymz-symbol-picker__card').length).toBeGreaterThan(1);
    expect(dialog.querySelector('[data-symbol-group="basic-directions"]')
      ?.classList.contains('ymz-symbol-picker__grid--spatial')).toBe(true);
    expect(dialog.querySelectorAll('[data-symbol-group="basic-directions"] .ymz-symbol-picker__cell--empty'))
      .toHaveLength(1);
    const rightArrow = dialog.querySelector<HTMLButtonElement>('[data-symbol-value="→"]');
    expect(rightArrow?.getAttribute('aria-label')).toBe('→');
    expect(rightArrow?.querySelector('small')?.textContent).toBe('右');
    picker.destroy();
    root.remove();
  });

  it('locks symbol insertion to the node that opened the persistent dialog', () => {
    expect(editor).toContain('private symbolTargetUid');
    expect(editor).toContain('this.commands?.insertSymbol(symbol, this.symbolTargetUid)');
    expect(editor).toContain('this.openSymbolPickerForUid(nodeUid)');
    expect(editor).toContain('this.openSymbolPickerForUid(uid)');
  });

  it('marks both delete variants as destructive', () => {
    expect(contextMenu).toMatch(/label: '删除当前和子节点'[^}]*warning: true/);
    expect(contextMenu).toMatch(/label: '仅删除当前'[^}]*warning: true/);
  });
});
