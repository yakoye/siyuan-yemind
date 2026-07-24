import { readFileSync } from 'node:fs';
import {
  canvasModeIcon,
  nodeInsertIcon,
  projectStyleIcon,
  nodeStyleIcon,
  undoIcon,
  redoIcon,
  searchIcon,
  markerIcon,
  clipartIcon,
  outerFrameIcon,
  relationIcon,
  fullscreenIcon,
} from '../../src/editor/projectControls';
import { suppliedIconSourceNames } from '../../src/editor/suppliedIcons';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const contextMenuSource = readFileSync('src/ui/contextMenu.ts', 'utf8');
const localAssetSource = readFileSync('src/ui/localAssetDialogs.ts', 'utf8');
const editorSource = readFileSync('src/editor/YeMindEditor.ts', 'utf8');
const templateSource = readFileSync('src/editor/editorTemplate.ts', 'utf8');
const cssSource = readFileSync('src/styles/index.css', 'utf8');

const supplied = [
  nodeInsertIcon('parent'),
  nodeInsertIcon('sibling'),
  nodeInsertIcon('child'),
  projectStyleIcon(),
  nodeStyleIcon(),
  markerIcon(),
  clipartIcon(),
  outerFrameIcon(),
  relationIcon(),
  undoIcon(),
  redoIcon(),
  searchIcon(),
  fullscreenIcon(),
];
assert(supplied.every((icon) => icon.startsWith('<img ')), 'all supplied operation icons must use an isolated image boundary');
assert(supplied.every((icon) => icon.includes('src="data:image/svg+xml;base64,')), 'all supplied icons must retain the exact Base64 SVG document');
assert(supplied.every((icon) => icon.includes('draggable="false"')), 'supplied icons must not start native image dragging');
assert(supplied.every((icon) => !icon.includes('<svg') && !icon.includes('<path')), 'host CSS must not reach supplied SVG geometry');
assert(nodeInsertIcon('parent').includes('ymz-icon-insert-parent'), 'upper-node icon must use the supplied parent source artwork');
assert(nodeInsertIcon('sibling').includes('ymz-icon-insert-sibling'), 'same-level icon must use the supplied sibling source artwork');
assert(nodeInsertIcon('child').includes('ymz-icon-insert-child'), 'lower-node icon must use the supplied child source artwork');
assert(projectStyleIcon().includes('ymz-icon-project-style') && projectStyleIcon().includes('data:image/svg+xml;base64,'), 'project style must preserve the supplied magic-wand document');
assert(nodeStyleIcon().includes('ymz-icon-node-style') && !nodeStyleIcon().includes('<svg'), 'node style must isolate the supplied settings artwork');
assert(undoIcon().includes('ymz-icon-undo') && undoIcon().includes('data:image/svg+xml;base64,'), 'undo must preserve the exact supplied source document');
assert(redoIcon().includes('ymz-icon-redo') && redoIcon().includes('data:image/svg+xml;base64,'), 'redo must preserve the exact supplied source document');
assert(searchIcon().includes('ymz-icon-search') && searchIcon().startsWith('<img '), 'search must use the isolated supplied source SVG');
assert(suppliedIconSourceNames.insertParent.includes('插入父节点图标'), 'supplied icons must retain source traceability');
assert(canvasModeIcon('select').includes('ymz-icon-canvas-pan'), 'canvas mode button must show the action after click');
assert(canvasModeIcon('pan').includes('ymz-icon-canvas-select'), 'canvas mode button must reverse the current mode icon');

const parentIndex = contextMenuSource.indexOf("label: '插入上级节点'");
const siblingIndex = contextMenuSource.indexOf("label: '插入同级节点'");
const childIndex = contextMenuSource.indexOf("label: '插入下级节点'");
assert(parentIndex >= 0 && siblingIndex > parentIndex && childIndex > siblingIndex, 'insert actions must be named and ordered upper, same, lower');
assert(contextMenuSource.includes("iconHTML: relationIcon()"), 'relationship menu must use the supplied SVG');
assert(contextMenuSource.includes("iconHTML: clipartIcon()"), 'clipart menu must use the supplied SVG');
assert(contextMenuSource.includes("iconHTML: outerFrameIcon()"), 'outer-frame menu must use the supplied SVG');

assert(!localAssetSource.includes('data-action="clipart-more"'), 'clipart dialog must not have a load-more button');
assert(localAssetSource.includes('hideCloseIcon: false'), 'asset dialogs must use the native top-right close button');
assert(localAssetSource.includes('prepareAssetDialog'), 'asset dialogs must close on outside click');
assert(!localAssetSource.includes('ymz-marker-section'), 'marker dialog must not render category headings');
assert(localAssetSource.includes('ymz-marker-groups') && localAssetSource.includes('scrollIntoView'), 'all marker groups must remain in one continuous scroll surface');
assert(localAssetSource.includes("addTab('', '全部')"), 'marker categories must start with All');

assert(editorSource.includes('this.openCheckpointManager();'), 'checkpoint toolbar action must open the manager directly');
assert(!editorSource.includes('this.openCheckpointMenu(button);'), 'checkpoint toolbar must not depend on the broken popup menu');
assert(templateSource.includes('fullscreenIcon()'), 'fullscreen toolbar must use the supplied SVG');
assert(cssSource.includes('var(--ymz-outline-branch-half)'), 'outline insertion square must align to the target branch marker center');

export default {
  icons: 15,
  menus: 4,
  dialogs: 6,
  checkpoints: 2,
  outline: 1,
};
