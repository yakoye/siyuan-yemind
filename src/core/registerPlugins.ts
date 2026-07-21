import MindMap from 'simple-mind-map';
import YeMindDrag from './YeMindDrag';
import Select from 'simple-mind-map/src/plugins/Select';
import MiniMap from 'simple-mind-map/src/plugins/MiniMap';
import Search from 'simple-mind-map/src/plugins/Search';
import Export from 'simple-mind-map/src/plugins/Export';
import Formula from 'simple-mind-map/src/plugins/Formula';
import AssociativeLine from 'simple-mind-map/src/plugins/AssociativeLine';
import OuterFrame from 'simple-mind-map/src/plugins/OuterFrame';
import NodeImgAdjust from 'simple-mind-map/src/plugins/NodeImgAdjust';
import RainbowLines from 'simple-mind-map/src/plugins/RainbowLines';
import YeMindRichText from '../editor/YeMindRichText';
import type { YeMindSettings } from '../settings/SettingsStore';

export const MIND_MAP_PLUGIN_NAMES = [
  'Drag',
  'Select',
  'MiniMap',
  'Search',
  'Export',
  'RichText',
  'Formula',
  'AssociativeLine',
  'OuterFrame',
  'NodeImgAdjust',
  'RainbowLines',
] as const;

const plugins = [YeMindDrag, Select, MiniMap, Search, Export, YeMindRichText, Formula, AssociativeLine, OuterFrame, NodeImgAdjust, RainbowLines];
let registered = false;

export function configureMindMapPlugins(settings?: YeMindSettings): void {
  const target = YeMindRichText as any;
  target.pluginOpt = target.pluginOpt ?? {};
  Object.assign(target.pluginOpt, {
    codeBlockTabSize: settings?.codeBlockTabSize ?? 2,
  });
}

export function registerMindMapPlugins(settings?: YeMindSettings): void {
  configureMindMapPlugins(settings);
  if (registered) return;
  plugins.forEach((plugin) => {
    if (plugin === YeMindRichText) (MindMap as any).usePlugin(plugin, (YeMindRichText as any).pluginOpt);
    else MindMap.usePlugin(plugin);
  });
  registered = true;
}
