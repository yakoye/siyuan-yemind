import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';
import { StudyPanelController } from '../../../src/editor/StudyPanelController';
import { createStudyCard, type StudyCard } from '../../../src/review/studyCards';

describe('v1.5.0 cards and review shell', () => {
  const css = readFileSync('src/styles/index.css', 'utf8').replace(/\r\n?/g, '\n');

  it('orders the real primary views as map, outline, cards and review', () => {
    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('学习导图');
    const actions = [...host.querySelectorAll<HTMLElement>('[data-primary-view]')]
      .map((button) => button.dataset.action);

    expect(actions).toEqual(['view-map', 'view-outline', 'view-cards', 'view-review']);
    expect(host.querySelector('[data-action="view-split"]')).toBeNull();
    expect(host.querySelector('[data-role="study-panel"]')).not.toBeNull();
  });

  it('creates a persistent card from the active real map node', async () => {
    const panel = document.createElement('aside');
    let cards: StudyCard[] = [];
    const onChange = vi.fn(async (next: StudyCard[]) => { cards = next; });
    const controller = new StudyPanelController({
      panel,
      getCards: () => cards,
      getActiveNode: () => ({ uid: 'node-1', text: '真实节点' }),
      onChange,
    });

    controller.show('cards');
    panel.querySelector<HTMLButtonElement>('[data-study-action="create"]')!.click();
    await Promise.resolve();

    expect(onChange).toHaveBeenCalledOnce();
    expect(cards).toEqual([expect.objectContaining({
      nodeUid: 'node-1',
      front: '真实节点',
      status: 'new',
    })]);
    expect(panel.querySelector<HTMLInputElement>('[data-study-field="front"]')?.value).toBe('真实节点');
  });

  it('reveals an answer before rating and persists the review schedule', async () => {
    const now = Date.UTC(2026, 6, 28);
    let cards = [createStudyCard({
      id: 'card-1',
      nodeUid: 'node-1',
      front: '问题',
      back: '答案',
      now,
    })];
    const controller = new StudyPanelController({
      panel: document.createElement('aside'),
      now: () => now,
      getCards: () => cards,
      getActiveNode: () => null,
      onChange: async (next) => { cards = next; },
    });

    controller.show('review');
    const panel = controller.element;
    expect(panel.querySelector('[data-role="study-answer"]')?.hasAttribute('hidden')).toBe(true);
    panel.querySelector<HTMLButtonElement>('[data-study-action="reveal"]')!.click();
    expect(panel.querySelector('[data-role="study-answer"]')?.hasAttribute('hidden')).toBe(false);
    panel.querySelector<HTMLButtonElement>('[data-study-rating="hard"]')!.click();
    await Promise.resolve();

    expect(cards[0]).toMatchObject({
      status: 'learning',
      repetitions: 1,
      intervalDays: 1,
      dueAt: now + 24 * 60 * 60 * 1_000,
    });
  });

  it('uses a one-third cards panel and a focused full-workspace review mode', () => {
    expect(css).toMatch(/\.ymz-study-panel\{[^}]*flex:[^;]*clamp\(320px,\s*33\.333%,\s*520px\)/s);
    expect(css).toMatch(/\[data-study-view="review"\] \.ymz-study-panel\{[^}]*position:absolute[^}]*inset:0/s);
    expect(css).toContain('[data-study-view="review"] .ymz-canvas');
    expect(css).toContain('[data-study-view="cards"] .ymz-node-quick-actions-layer');
  });

  it('supports progress, favorites, card flipping, status changes and fullscreen cards', async () => {
    const now = Date.UTC(2026, 6, 28);
    let cards = [
      createStudyCard({ id: 'card-1', nodeUid: 'node-1', front: '问题', back: '答案', now }),
    ];
    const controller = new StudyPanelController({
      panel: document.createElement('aside'),
      now: () => now,
      getCards: () => cards,
      getActiveNode: () => null,
      onChange: async (next) => { cards = next; },
    });
    controller.show('cards');
    const panel = controller.element;

    expect(panel.querySelector('[data-role="study-progress"]')).not.toBeNull();
    expect(panel.querySelector('[data-study-filter="starred"]')).not.toBeNull();
    panel.querySelector<HTMLButtonElement>('[data-study-action="flip"]')!.click();
    expect(panel.querySelector('[data-study-face]')?.textContent).toContain('答案');
    panel.querySelector<HTMLButtonElement>('[data-study-status="mastered"]')!.click();
    await Promise.resolve();
    expect(cards[0].status).toBe('mastered');

    panel.querySelector<HTMLButtonElement>('[data-study-action="fullscreen"]')!.click();
    expect(panel.dataset.studyFullscreen).toBe('true');
    expect(css).toContain('.ymz-study-panel[data-study-fullscreen="true"]');
  });

  it('serializes rapid card changes without dropping the later action', async () => {
    const now = Date.UTC(2026, 6, 28);
    let cards = [
      createStudyCard({ id: 'card-1', nodeUid: 'node-1', front: '问题', back: '答案', now }),
    ];
    let releaseFirstSave!: () => void;
    const firstSave = new Promise<void>((resolve) => { releaseFirstSave = resolve; });
    const saves: StudyCard[][] = [];
    const controller = new StudyPanelController({
      panel: document.createElement('aside'),
      now: () => now,
      getCards: () => cards,
      getActiveNode: () => null,
      onChange: async (next) => {
        saves.push(next);
        if (saves.length === 1) await firstSave;
        cards = next;
      },
    });
    controller.show('cards');
    const panel = controller.element;

    panel.querySelector<HTMLButtonElement>('[data-study-action="star"]')!.click();
    panel.querySelector<HTMLButtonElement>('[data-study-status="mastered"]')!.click();
    expect(saves).toHaveLength(1);

    releaseFirstSave();
    await firstSave;
    await Promise.resolve();
    await Promise.resolve();

    expect(saves).toHaveLength(2);
    expect(cards[0]).toMatchObject({ starred: true, status: 'mastered' });
  });

  it('uses the confirmed three review ratings and requeues an again card', async () => {
    const now = Date.UTC(2026, 6, 28);
    let cards = [
      createStudyCard({ id: 'card-1', nodeUid: 'node-1', front: '问题一', back: '答案一', now }),
      createStudyCard({ id: 'card-2', nodeUid: 'node-2', front: '问题二', back: '答案二', now }),
    ];
    const controller = new StudyPanelController({
      panel: document.createElement('aside'),
      now: () => now,
      getCards: () => cards,
      getActiveNode: () => null,
      onChange: async (next) => { cards = next; },
    });
    controller.show('review');
    const panel = controller.element;
    expect(panel.querySelectorAll('[data-study-rating]')).toHaveLength(3);
    panel.querySelector<HTMLButtonElement>('[data-study-action="reveal"]')!.click();
    panel.querySelector<HTMLButtonElement>('[data-study-rating="again"]')!.click();
    await Promise.resolve();

    expect(panel.textContent).toContain('问题二');
    panel.querySelector<HTMLButtonElement>('[data-study-action="reveal"]')!.click();
    panel.querySelector<HTMLButtonElement>('[data-study-rating="easy"]')!.click();
    await Promise.resolve();
    expect(panel.textContent).toContain('问题一');
  });

  it('starts review with only the cards visible under the current filter', () => {
    const now = Date.UTC(2026, 6, 28);
    const cards = [
      createStudyCard({ id: 'card-1', nodeUid: 'node-1', front: '保留', back: '答案一', now }),
      { ...createStudyCard({ id: 'card-2', nodeUid: 'node-2', front: '排除', back: '答案二', now }), status: 'mastered' as const },
    ];
    const controller = new StudyPanelController({
      panel: document.createElement('aside'),
      now: () => now,
      getCards: () => cards,
      getActiveNode: () => null,
      onChange: vi.fn(),
    });
    controller.show('cards');
    controller.element.querySelector<HTMLButtonElement>('[data-study-filter="new"]')!.click();
    controller.element.querySelector<HTMLButtonElement>('[data-study-action="start-review"]')!.click();

    expect(controller.element.textContent).toContain('保留');
    expect(controller.element.textContent).not.toContain('排除');
  });

  it('keeps all card mutations disabled in readonly mode', () => {
    const now = Date.UTC(2026, 6, 28);
    const cards = [createStudyCard({ id: 'card-1', nodeUid: 'node-1', front: '锁定卡片', back: '答案', now })];
    const onChange = vi.fn();
    const controller = new StudyPanelController({
      panel: document.createElement('aside'),
      now: () => now,
      readonly: () => true,
      getCards: () => cards,
      getActiveNode: () => ({ uid: 'node-1', text: '节点' }),
      onChange,
    });
    controller.show('cards');

    expect(controller.element.querySelector<HTMLButtonElement>('[data-study-action="create"]')?.disabled).toBe(true);
    expect(controller.element.querySelector<HTMLInputElement>('[data-study-field="front"]')?.disabled).toBe(true);
    expect(controller.element.querySelector<HTMLButtonElement>('[data-study-action="delete"]')?.disabled).toBe(true);
    controller.element.querySelector<HTMLButtonElement>('[data-study-action="star"]')!.click();
    controller.element.querySelector<HTMLButtonElement>('[data-study-status="mastered"]')!.click();
    expect(onChange).not.toHaveBeenCalled();
  });
});
