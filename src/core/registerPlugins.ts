import MindMap from 'simple-mind-map';
import Drag from 'simple-mind-map/src/plugins/Drag';
import Select from 'simple-mind-map/src/plugins/Select';
import MiniMap from 'simple-mind-map/src/plugins/MiniMap';
import Search from 'simple-mind-map/src/plugins/Search';
import Export from 'simple-mind-map/src/plugins/Export';

let registered = false;

export function registerMindMapPlugins(): void {
  if (registered) return;
  [Drag, Select, MiniMap, Search, Export].forEach((plugin) => MindMap.usePlugin(plugin));
  registered = true;
}
