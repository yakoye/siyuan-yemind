import MindMap from 'simple-mind-map';
import Drag from 'simple-mind-map/src/plugins/Drag';
import Select from 'simple-mind-map/src/plugins/Select';
import MiniMap from 'simple-mind-map/src/plugins/MiniMap';
import Search from 'simple-mind-map/src/plugins/Search';
import Export from 'simple-mind-map/src/plugins/Export';
import RichText from 'simple-mind-map/src/plugins/RichText';
import Formula from 'simple-mind-map/src/plugins/Formula';
import AssociativeLine from 'simple-mind-map/src/plugins/AssociativeLine';
import NodeImgAdjust from 'simple-mind-map/src/plugins/NodeImgAdjust';

export const MIND_MAP_PLUGIN_NAMES = [
  'Drag',
  'Select',
  'MiniMap',
  'Search',
  'Export',
  'RichText',
  'Formula',
  'AssociativeLine',
  'NodeImgAdjust',
] as const;

const plugins = [Drag, Select, MiniMap, Search, Export, RichText, Formula, AssociativeLine, NodeImgAdjust];
let registered = false;

export function registerMindMapPlugins(): void {
  if (registered) return;
  plugins.forEach((plugin) => MindMap.usePlugin(plugin));
  registered = true;
}
