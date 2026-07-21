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
      dragMode: 'structure',
      dragEdgeAutoPan: false,
      preserveViewportAfterDrag: true,
      restoreSavedView: true,
      limitMindMapInCanvas: false,
      minZoomRatio: 20,
      maxZoomRatio: 400,
      fitPadding: 50,
      secondLevelMarginX: 100,
      secondLevelMarginY: 40,
      nodeMarginX: 50,
      nodeMarginY: 16,
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
      dragMode: 'free',
      dragEdgeAutoPan: true,
      preserveViewportAfterDrag: false,
      restoreSavedView: false,
      limitMindMapInCanvas: true,
      minZoomRatio: 30,
      maxZoomRatio: 300,
      fitPadding: 80,
      secondLevelMarginX: 130,
      secondLevelMarginY: 48,
      nodeMarginX: 70,
      nodeMarginY: 22,
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
      dragMode: 'free',
      dragEdgeAutoPan: true,
      preserveViewportAfterDrag: false,
      restoreSavedView: false,
      limitMindMapInCanvas: true,
      minZoomRatio: 30,
      maxZoomRatio: 300,
      fitPadding: 80,
      secondLevelMarginX: 130,
      secondLevelMarginY: 48,
      nodeMarginX: 70,
      nodeMarginY: 22,
      shortcutMap: { ...DEFAULT_SHORTCUTS, search: 'Ctrl+Shift+f', comments: '' },
    });
  });
});
