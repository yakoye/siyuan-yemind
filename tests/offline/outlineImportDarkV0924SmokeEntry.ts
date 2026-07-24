import { readFileSync } from 'node:fs';
import { parseOutlineTreeText } from '../../src/editor/outlineTreeImport';
import { createDefaultTree } from '../../src/model/defaultMap';
import { applyMapAppearanceTransaction } from '../../src/core/appearanceTransaction';
import { getThemeColorAppearance } from '../../src/core/themeColorData';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
const parsed = parseOutlineTreeText('根\n├─ A\n│  └─ A1\n└─ B', 'unicode-tree');
assert(JSON.stringify(parsed.lines.map((x) => x.depth)) === JSON.stringify([0,1,2,1]), 'Unicode tree depth parse failed');
const windows = parseOutlineTreeText('\\---lite-ime\n|   \\---LiteIME-repo\n|   |   \\---CMakeLists.txt', 'auto');
assert(windows.detectedMode === 'windows-tree' && JSON.stringify(windows.lines.map((x) => x.depth)) === JSON.stringify([0,1,2]), 'Windows tree parse failed');
assert(createDefaultTree().children.length === 0, 'default tree must not create leaf nodes');
const setCalls: unknown[] = [];
const transform = { scaleX: 1, scaleY: 1, translateX: 42, translateY: -8 };
const map: any = { opt:{}, renderer:{activeNodeList:[]}, view:{getTransformData:()=>({...transform}),setTransformData:(v:unknown)=>setCalls.push(v)}, setThemeConfig(){}, updateConfig(){}, reRender(cb:()=>void){cb();} };
const appearance = getThemeColorAppearance('scheme-code','dark'); assert(appearance,'dark appearance missing');
applyMapAppearanceTransaction({map,themeConfig:{},rainbowLinesConfig:{},colorAppearance:appearance,useThemeLineColors:true});
assert(JSON.stringify(setCalls[0])===JSON.stringify(transform),'view transform must be restored');
const source = readFileSync('src/editor/RichTextToolbar.ts','utf8'); assert(source.includes('#iconMath')&&!source.includes('>π<'),'formula icon not replaced');
const menu = readFileSync('src/ui/contextMenu.ts','utf8'); assert(menu.includes('文本转导图…')&&menu.includes('剪切（当前行）'),'outline menu not added');
const css = readFileSync('src/styles/index.css','utf8'); assert(/\.ymz-project-control select[^}]*color-scheme/s.test(css),'native theme/line select must expose color-scheme');
export default { parser:true, defaultCenterOnly:true, transformRestored:true, formulaIcon:true, outlineMenu:true, darkControls:true };
