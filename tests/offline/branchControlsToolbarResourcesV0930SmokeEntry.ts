import { expandAllBranches, expandBranchDeep, expandBranchOneLevel } from '../../src/core/expandState';
import { resolveNodeQuickActionSide } from '../../src/editor/nodeQuickActions';
import { createEditorTemplate } from '../../src/editor/editorTemplate';
import { lockIcon, pinIcon } from '../../src/editor/projectControls';
import { DEFAULT_SETTINGS } from '../../src/settings/SettingsStore';

function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
const tree: any = { data: { uid: 'root', expand: false }, children: [{ data: { uid: 'a', expand: false }, children: [{ data: { uid: 'a1', expand: false }, children: [{}] }] }] };
assert(resolveNodeQuickActionSide('logicalStructureLeft', { layerIndex: 2 }) === 'left', 'left logic placement failed');
assert(resolveNodeQuickActionSide('mindMap', { layerIndex: 1, dir: 'left' }) === 'left', 'mind-map branch placement failed');
assert(resolveNodeQuickActionSide('organizationStructure', { layerIndex: 1 }) === 'bottom', 'organization placement failed');
assert(expandBranchOneLevel(tree, 'a').tree.children![0].children![0].data.expand === false, 'quick one-level expand failed');
assert(expandBranchDeep(tree, 'a').tree.children![0].children![0].data.expand === true, 'deep branch expand failed');
assert(expandAllBranches(tree).tree.children![0].children![0].data.expand === true, 'full map expand failed');
assert(DEFAULT_SETTINGS.toolbarsPinned === true, 'toolbars should be pinned by default');
const html = createEditorTemplate('Demo');
assert(html.includes('data-toolbars-pinned="true"'), 'template pinned state missing');
assert(html.indexOf('data-action="zen"') < html.indexOf('data-action="toggle-toolbar-pin"'), 'pin should follow zen');
assert(pinIcon(true).includes('ymz-icon-pin--fixed') && pinIcon(false).includes('ymz-icon-pin--auto'), 'pin variants missing');
assert(lockIcon(true).includes('ymz-icon-lock--closed') && lockIcon(false).includes('ymz-icon-lock--open'), 'lock variants missing');
export default { pinned: DEFAULT_SETTINGS.toolbarsPinned, side: resolveNodeQuickActionSide('timeline2', { layerIndex: 1, dir: 'top' }) };
