import MindMap from 'simple-mind-map';
import YeMindDrag from './YeMindDrag';
import Select from 'simple-mind-map/src/plugins/Select';
import MiniMap from 'simple-mind-map/src/plugins/MiniMap';
import Search from 'simple-mind-map/src/plugins/Search';
import Export from 'simple-mind-map/src/plugins/Export';
import Formula from 'simple-mind-map/src/plugins/Formula';
import AssociativeLine from 'simple-mind-map/src/plugins/AssociativeLine';
import OuterFrame from 'simple-mind-map/src/plugins/OuterFrame';
import YeMindNodeImgAdjust from './YeMindNodeImgAdjust';
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

const plugins = [YeMindDrag, Select, MiniMap, Search, Export, YeMindRichText, Formula, AssociativeLine, OuterFrame, YeMindNodeImgAdjust, RainbowLines];
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
    const runtime = MindMap as any;
    const list = Array.isArray(runtime.pluginList) ? runtime.pluginList : [];
    const sameInstanceIndex = list.findIndex((item: any) => item?.instanceName === (plugin as any).instanceName);
    if (sameInstanceIndex >= 0) {
      // The package UMD build pre-registers upstream plugins. Replace plugins
      // by instanceName so tests and production both use YeMind's overrides.
      (plugin as any).pluginOpt = plugin === YeMindRichText ? (YeMindRichText as any).pluginOpt : {};
      list.splice(sameInstanceIndex, 1, plugin);
    } else if (plugin === YeMindRichText) {
      runtime.usePlugin(plugin, (YeMindRichText as any).pluginOpt);
    } else {
      runtime.usePlugin(plugin);
    }
  });
  registered = true;
}
