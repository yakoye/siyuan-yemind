import { describe, expect, it } from 'vitest';
import { DEFAULT_SHORTCUTS, SettingsStore } from '../src/settings/SettingsStore';

describe('SettingsStore', () => {
  it('normalizes invalid values and fills every v0.4 setting default', async () => {
    const store = new SettingsStore({
      load: async () => ({
        defaultLayout: 'bad',
        canvasMode: 'select',
        wheelMode: 'pan',
        autosaveDelayMs: -2,
        externalLinkMode: 'bad',
        defaultCodeLanguage: '',
        codeBlockTabSize: 7,
        codeBlockFontSize: 2,
        clozeMode: 'bad',
      }),
      save: async () => {},
    });

    await store.load();

    expect(store.get()).toEqual({
      defaultLayout: 'logicalStructure',
      canvasMode: 'select',
      wheelMode: 'pan',
      showQuickCreate: true,
      autoFitOnOpen: true,
      autosaveDelayMs: 350,
      showRichTextToolbar: true,
      inlineLinkAutoHttps: true,
      externalLinkMode: 'new-window',
      defaultCodeLanguage: 'plain',
      codeBlockWrap: false,
      codeBlockShowLanguage: true,
      codeBlockTabSize: 2,
      codeBlockFontSize: 13,
      clozeMode: 'hidden',
      clozeRevealOnHover: true,
      showTodoBadge: true,
      showCommentBadge: true,
      defaultZenMode: false,
      defaultReadonlyMode: false,
      showNodeMenuButton: true,
      defaultViewMode: 'map',
      dragEdgeAutoPan: false,
      restoreSavedView: true,
      limitMindMapInCanvas: false,
      minZoomRatio: 20,
      maxZoomRatio: 400,
      fitPadding: 50,
      secondLevelMarginX: 100,
      secondLevelMarginY: 40,
      nodeMarginX: 50,
      nodeMarginY: 16,
      defaultSummaryText: '概要',
      defaultRelationText: '关联',
      relationAlwaysAboveNode: true,
      relationAdjustPoints: true,
      shortcutMap: DEFAULT_SHORTCUTS,
    });
  });

  it('persists typed v0.4 setting updates', async () => {
    let saved: unknown;
    const store = new SettingsStore({
      load: async () => ({}),
      save: async (value) => { saved = value; },
    });
    await store.load();

    await store.update({
      defaultLayout: 'mindMap',
      autosaveDelayMs: 900,
      showRichTextToolbar: false,
      externalLinkMode: 'current-window',
      defaultCodeLanguage: 'typescript',
      codeBlockWrap: true,
      codeBlockTabSize: 4,
      codeBlockFontSize: 15,
      clozeMode: 'blur',
      showCommentBadge: false,
      defaultZenMode: true,
      defaultReadonlyMode: true,
      showNodeMenuButton: false,
      defaultViewMode: 'split',
      dragEdgeAutoPan: true,
      restoreSavedView: false,
      limitMindMapInCanvas: true,
      minZoomRatio: 30,
      maxZoomRatio: 300,
      fitPadding: 80,
      secondLevelMarginX: 130,
      secondLevelMarginY: 48,
      nodeMarginX: 70,
      nodeMarginY: 22,
      defaultSummaryText: '结论',
      defaultRelationText: '依赖',
      relationAlwaysAboveNode: false,
      relationAdjustPoints: false,
      shortcutMap: { ...DEFAULT_SHORTCUTS, search: 'Ctrl+Shift+f', comments: '' },
    });

    expect(saved).toMatchObject({
      defaultLayout: 'mindMap',
      autosaveDelayMs: 900,
      showRichTextToolbar: false,
      externalLinkMode: 'current-window',
      defaultCodeLanguage: 'typescript',
      codeBlockWrap: true,
      codeBlockTabSize: 4,
      codeBlockFontSize: 15,
      clozeMode: 'blur',
      showCommentBadge: false,
      defaultZenMode: true,
      defaultReadonlyMode: true,
      showNodeMenuButton: false,
      defaultViewMode: 'split',
      dragEdgeAutoPan: true,
      restoreSavedView: false,
      limitMindMapInCanvas: true,
      minZoomRatio: 30,
      maxZoomRatio: 300,
      fitPadding: 80,
      secondLevelMarginX: 130,
      secondLevelMarginY: 48,
      nodeMarginX: 70,
      nodeMarginY: 22,
      defaultSummaryText: '结论',
      defaultRelationText: '依赖',
      relationAlwaysAboveNode: false,
      relationAdjustPoints: false,
      shortcutMap: { ...DEFAULT_SHORTCUTS, search: 'Ctrl+Shift+f', comments: '' },
    });
  });
});

  it('keeps the previous in-memory settings when persistence fails', async () => {
    const store = new SettingsStore({
      load: async () => ({ autosaveDelayMs: 350 }),
      save: async () => { throw new Error('disk full'); },
    });
    await store.load();

    await expect(store.update({ autosaveDelayMs: 900 })).rejects.toThrow('disk full');
    expect(store.get().autosaveDelayMs).toBe(350);
  });

it('serializes concurrent setting updates without losing an earlier patch', async () => {
  const pending: Array<{ value: any; resolve: () => void }> = [];
  const store = new SettingsStore({
    load: async () => ({}),
    save: (value) => new Promise<void>((resolve) => pending.push({ value: structuredClone(value), resolve })),
  });
  await store.load();

  const first = store.update({ autosaveDelayMs: 900 });
  const second = store.update({ showRichTextToolbar: false });
  await Promise.resolve();
  expect(pending).toHaveLength(1);
  pending[0].resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(pending).toHaveLength(2);
  expect(pending[1].value).toMatchObject({ autosaveDelayMs: 900, showRichTextToolbar: false });
  pending[1].resolve();
  await Promise.all([first, second]);
});
