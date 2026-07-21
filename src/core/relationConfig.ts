import type { YeMindSettings } from '../settings/SettingsStore';

export interface NativeRelationOptions {
  defaultGeneralizationText: string;
  defaultAssociativeLineText: string;
  associativeLineIsAlwaysAboveNode: boolean;
  enableAdjustAssociativeLinePoints: boolean;
}

export function buildRelationOptions(settings: YeMindSettings): NativeRelationOptions {
  return {
    defaultGeneralizationText: settings.defaultSummaryText,
    defaultAssociativeLineText: settings.defaultRelationText,
    associativeLineIsAlwaysAboveNode: settings.relationAlwaysAboveNode,
    enableAdjustAssociativeLinePoints: settings.relationAdjustPoints,
  };
}
