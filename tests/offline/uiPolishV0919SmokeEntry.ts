import { readFileSync } from 'node:fs';
import {
  canvasModeIcon,
  nodeInsertIcon,
  projectStyleIcon,
  nodeStyleIcon,
  undoIcon,
  redoIcon,
  searchIcon,
} from '../../src/editor/projectControls';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const contextMenuSource = readFileSync('src/ui/contextMenu.ts', 'utf8');
const localAssetSource = readFileSync('src/ui/localAssetDialogs.ts', 'utf8');
const editorSource = readFileSync('src/editor/YeMindEditor.ts', 'utf8');
const templateSource = readFileSync('src/editor/editorTemplate.ts', 'utf8');
const cssSource = readFileSync('src/styles/index.css', 'utf8');

assert(nodeInsertIcon('parent').includes('M11.833 20.75v-6'), 'upper-node icon must use the supplied relationship SVG');
assert(nodeInsertIcon('sibling').includes('M20.868 24h-9.733'), 'same-level icon must use the supplied relationship SVG');
assert(nodeInsertIcon('child').includes('M24.75 23.75h-9.167'), 'lower-node icon must use the supplied relationship SVG');
assert(projectStyleIcon().includes('M9.136 10.536'), 'project style must use the supplied magic-wand SVG');
assert(nodeStyleIcon().includes('M2.74071 10.2339'), 'node style must use the supplied style-settings SVG');
assert(undoIcon().includes('M.8 3.6h7.5'), 'undo must use the supplied SVG');
assert(redoIcon().includes('M13.8 3.6H6.3'), 'redo must use the supplied SVG');
assert(searchIcon().includes('M12.038 2.714'), 'search must use the supplied SVG');
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
assert(localAssetSource.includes('data-action="asset-dialog-close"'), 'asset dialogs must have an explicit top-right close button');
assert(localAssetSource.includes('bindOutsideClose'), 'asset dialogs must close on outside click');
assert(localAssetSource.includes('ymz-marker-section'), 'marker dialog must render all categorized sections in one scroll area');
assert(localAssetSource.includes("all.textContent = '全部'"), 'marker categories must start with All');

assert(editorSource.includes('this.openCheckpointManager();'), 'checkpoint toolbar action must open the manager directly');
assert(!editorSource.includes('this.openCheckpointMenu(button);'), 'checkpoint toolbar must not depend on the broken popup menu');
assert(templateSource.includes('fullscreenIcon()'), 'fullscreen toolbar must use the supplied SVG');
assert(cssSource.includes('var(--ymz-outline-branch-half)'), 'outline insertion square must align to the target branch marker center');

export default {
  icons: 10,
  menus: 4,
  dialogs: 5,
  checkpoints: 2,
  outline: 1,
};
