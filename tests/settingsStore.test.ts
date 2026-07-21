import { describe, expect, it } from 'vitest';
import { SettingsStore } from '../src/settings/SettingsStore';

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
    });
  });
});
