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
      splitOutlineRatio: 0.42,
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
      defaultOuterFrameText: '外框',
      outerFramePaddingX: 10,
      outerFramePaddingY: 10,
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
      splitOutlineRatio: 0.55,
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
      defaultOuterFrameText: '重点',
      outerFramePaddingX: 24,
      outerFramePaddingY: 18,
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
      splitOutlineRatio: 0.55,
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
      defaultOuterFrameText: '重点',
      outerFramePaddingX: 24,
      outerFramePaddingY: 18,
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

it('clamps outer-frame padding while preserving defaults for malformed legacy values', async () => {
  const store = new SettingsStore({
    load: async () => ({ outerFramePaddingX: -4.8, outerFramePaddingY: 120 }),
    save: async () => {},
  });
  await store.load();
  expect(store.get().outerFramePaddingX).toBe(0);
  expect(store.get().outerFramePaddingY).toBe(80);

  const malformed = new SettingsStore({
    load: async () => ({ defaultOuterFrameText: '', outerFramePaddingX: 'bad', outerFramePaddingY: null }),
    save: async () => {},
  });
  await malformed.load();
  expect(malformed.get()).toMatchObject({
    defaultOuterFrameText: '外框',
    outerFramePaddingX: 10,
    outerFramePaddingY: 10,
  });
});
