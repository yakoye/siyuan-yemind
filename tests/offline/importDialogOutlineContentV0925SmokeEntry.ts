import { readFileSync } from 'node:fs';
import { applyOutlineImport, OUTLINE_IMPORT_AUTO_WIDTH, outlineImportDisplayUnits, parseOutlineTreeText } from '../../src/editor/outlineTreeImport';
import { outlineAccessoriesFromData, outlineAccessoriesHtml } from '../../src/editor/outlineAccessories';
import { flattenStructuredOutline } from '../../src/editor/structuredOutlineDocument';
import type { MindMapTree } from '../../src/model/types';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
const dialog = readFileSync('src/ui/textToMapDialog.ts', 'utf8');
const css = readFileSync('src/styles/index.css', 'utf8');
const template = readFileSync('src/editor/editorTemplate.ts', 'utf8');
const editor = readFileSync('src/editor/YeMindEditor.ts', 'utf8');
const importer = readFileSync('src/editor/outlineTreeImport.ts', 'utf8');
const outline = readFileSync('src/editor/structuredOutlineDocument.ts', 'utf8');
const contextMenu = readFileSync('src/ui/contextMenu.ts', 'utf8');
assert(dialog.includes("height: 'min(700px, calc(100vh - 64px))'"), 'dialog height must be viewport bounded');
assert(dialog.includes('previewRowsHtml') && dialog.includes('ymz-text-map-dialog__preview-row'), 'processed preview rows missing');
assert(/\.ymz-text-map-dialog__body\{[^}]*min-height:0[^}]*overflow:hidden/s.test(css), 'dialog body must not grow with pasted text');
assert(template.includes('data-role="theme-choice-panel"') && template.includes('data-role="line-style-choice-panel"'), 'custom theme/line panels missing');
assert(editor.includes('ProjectChoicePanel'), 'choice panel controller missing');
assert(importer.includes('OUTLINE_IMPORT_AUTO_WIDTH') && importer.includes('outlineImportDisplayUnits'), 'import width policy missing');
assert(outline.includes('accessories: outlineAccessoriesFromData'), 'outline accessory synchronization missing');
assert(contextMenu.includes("label: '添加'") && contextMenu.includes("label: '剪贴图'"), 'outline content submenu missing');

const longText = '这是一个超过二十个汉字但不修改原始字符串内容的节点标题';
assert(outlineImportDisplayUnits(longText) > 20, 'long CJK text must cross the import width threshold');
const base: MindMapTree = { data: { uid: 'root', text: '根' }, children: [{ data: { uid: 'target', text: '目标' }, children: [] }] };
const imported = applyOutlineImport(base, 'target', parseOutlineTreeText(`短节点\n${longText}`, 'plain'), 'append-under-current');
assert(imported.children[0].children[0].data.width === undefined, 'short import must not receive forced width');
assert(imported.children[0].children[1].data.width === OUTLINE_IMPORT_AUTO_WIDTH, 'long import must receive the default width');
assert(imported.children[0].children[1].data.customTextWidth === OUTLINE_IMPORT_AUTO_WIDTH, 'runtime text width must be applied');
assert(imported.children[0].children[1].data.text === longText, 'import width policy must not insert source newlines');

const data = { uid: 'n1', text: '节点', icon: ['yemind_star', 'priority_1'], image: 'data:image/png;base64,AAAA', imageTitle: '图', yemindClipartId: 'plant-1' };
const accessories = outlineAccessoriesFromData(data);
assert(accessories.icons.length === 2 && accessories.image?.clipartId === 'plant-1', 'outline accessory extraction failed');
assert(outlineAccessoriesHtml(accessories).includes('contenteditable="false"'), 'outline accessories must stay outside text editing');
assert(flattenStructuredOutline({ data, children: [] })[0]?.accessories.icons.length === 2, 'flattened outline lost accessories');

export default { dialog:true, processedPreview:true, customPanels:true, widthPolicy:true, outlineAccessories:true };
