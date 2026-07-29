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

  it('captures complete node content and refreshes only the source snapshot', async () => {
    const panel = document.createElement('aside');
    let cards: StudyCard[] = [];
    let currentText = '原始题面';
    const sourceFor = (text: string) => ({
      version: 1 as const,
      capturedAt: text === '原始题面' ? 1_000 : 2_000,
      nodeTextHtml: `<strong>${text}</strong>`,
      nodeTextPlain: text,
      icons: ['priority-1'],
      tags: ['PCIe'],
      todo: { checked: false, text: '完成复习' },
      hyperlink: 'https://example.com',
      hyperlinkTitle: '规范',
      image: {
        src: 'data:image/png;base64,AAAA',
        title: '链路图',
        kind: 'image' as const,
        width: 320,
        height: 180,
      },
      noteHtml: '<p>备注正文</p>',
      comments: [{ id: 'c1', text: '批注正文', createdAt: 1, updatedAt: 1 }],
    });
    const getNode = () => ({
      uid: 'node-rich',
      text: currentText,
      back: '默认答案',
      source: sourceFor(currentText),
    });
    const controller = new StudyPanelController({
      panel,
      id: () => 'card-rich',
      now: () => 3_000,
      getCards: () => cards,
      getActiveNode: getNode,
      getNodeByUid: (uid: string) => uid === 'node-rich' ? getNode() : null,
      onChange: async (next: StudyCard[]) => { cards = next; },
    } as ConstructorParameters<typeof StudyPanelController>[0] & {
      getNodeByUid(uid: string): ReturnType<typeof getNode> | null;
    });

    await controller.createCardFromActiveNode();
    expect(cards[0]).toMatchObject({
      front: '原始题面',
      back: '默认答案',
      source: {
        nodeTextPlain: '原始题面',
        image: { title: '链路图' },
        noteHtml: '<p>备注正文</p>',
        comments: [{ text: '批注正文' }],
      },
    });

    cards = [{ ...cards[0], front: '用户题面', back: '用户答案' }];
    currentText = '更新后的节点';
    controller.show('cards');
    const sync = panel.querySelector<HTMLButtonElement>('[data-study-action="sync-source"]');
    expect(sync).not.toBeNull();
    sync!.click();
    await Promise.resolve();

    expect(cards[0]).toMatchObject({
      front: '用户题面',
      back: '用户答案',
      source: { nodeTextPlain: '更新后的节点', capturedAt: 2_000 },
    });
  });

  it('keeps a deleted source card reviewable and disables source refresh', () => {
    const now = 4_000;
    const cards = [createStudyCard({
      id: 'orphan-card',
      nodeUid: 'deleted-node',
      front: '保留的问题',
      back: '保留的答案',
      now,
      source: {
        version: 1,
        capturedAt: now,
        nodeTextHtml: '已删除节点',
        nodeTextPlain: '已删除节点',
        icons: [],
        tags: [],
        todo: null,
        hyperlink: '',
        hyperlinkTitle: '',
        image: null,
        noteHtml: '',
        comments: [],
      },
    })];
    const controller = new StudyPanelController({
      panel: document.createElement('aside'),
      getCards: () => cards,
      getActiveNode: () => null,
      getNodeByUid: () => null,
      onChange: vi.fn(),
    } as ConstructorParameters<typeof StudyPanelController>[0] & {
      getNodeByUid(uid: string): null;
    });

    controller.show('cards');

    expect(controller.element.textContent).toContain('来源节点已删除');
    expect(controller.element.querySelector<HTMLButtonElement>('[data-study-action="sync-source"]')?.disabled).toBe(true);
    controller.show('review', ['orphan-card']);
    expect(controller.element.textContent).toContain('保留的问题');
  });

  it('renders the same complete source content in cards and review with image preview', () => {
    const preview = vi.fn();
    const card = createStudyCard({
      id: 'content-card',
      nodeUid: 'node-content',
      front: '什么是 LTSSM？',
      back: '链路训练状态机',
      now: 5_000,
      source: {
        version: 1,
        capturedAt: 5_000,
        nodeTextHtml: '<strong>LTSSM</strong><span class="ql-formula" data-value="x^2">x²</span>',
        nodeTextPlain: 'LTSSM x²',
        icons: ['yemind_star'],
        tags: ['PCIe', 'SerDes'],
        todo: { checked: true, text: '完成学习' },
        hyperlink: 'https://example.com/ltssm',
        hyperlinkTitle: 'LTSSM 规范',
        image: {
          src: 'data:image/png;base64,AAAA',
          title: '状态转换图',
          kind: 'image',
          width: 320,
          height: 180,
        },
        noteHtml: '<p>进入 <em>Recovery</em></p>',
        comments: [
          { id: 'c1', text: '注意 Detect 状态', createdAt: 1, updatedAt: 1 },
          { id: 'c2', text: '比较 L0 与 L0s', createdAt: 2, updatedAt: 2 },
        ],
      },
    });
    const controller = new StudyPanelController({
      panel: document.createElement('aside'),
      getCards: () => [card],
      getActiveNode: () => null,
      getNodeByUid: () => null,
      onPreviewSourceImage: preview,
      onChange: vi.fn(),
    } as ConstructorParameters<typeof StudyPanelController>[0] & {
      getNodeByUid(uid: string): null;
      onPreviewSourceImage(src: string, title: string): void;
    });

    controller.show('cards');
    expect(controller.element.querySelector('[data-study-source-front]')?.textContent).toContain('完成学习');
    expect(controller.element.querySelector('[data-study-source-front]')?.textContent).toContain('PCIe');
    expect(controller.element.querySelector('[data-study-source-front]')?.textContent).toContain('★');
    expect(controller.element.querySelector('[data-study-source-front] .ql-formula')).not.toBeNull();
    controller.element.querySelector<HTMLButtonElement>('[data-study-action="preview-source-image"]')!.click();
    expect(preview).toHaveBeenCalledWith('data:image/png;base64,AAAA', '状态转换图');
    controller.element.querySelector<HTMLButtonElement>('[data-study-action="flip"]')!.click();
    expect(controller.element.querySelector('[data-study-source-back]')?.innerHTML).toContain('<em>Recovery</em>');
    expect(controller.element.querySelector('[data-study-source-back]')?.textContent).toContain('注意 Detect 状态');

    controller.show('review', ['content-card']);
    expect(controller.element.querySelector('[data-study-source-front]')).not.toBeNull();
    controller.element.querySelector<HTMLButtonElement>('[data-study-action="reveal"]')!.click();
    expect(controller.element.querySelector('[data-study-source-back]')?.textContent).toContain('比较 L0 与 L0s');
  });

  it('searches complete card source notes, comments, tags and image titles', () => {
    const card = createStudyCard({
      id: 'search-source-card',
      nodeUid: 'source-node',
      front: '普通题面',
      back: '普通答案',
      now: 6_000,
      source: {
        version: 1,
        capturedAt: 6_000,
        nodeTextHtml: '<p>节点原文</p>',
        nodeTextPlain: '节点原文',
        icons: [],
        tags: ['链路训练'],
        todo: null,
        hyperlink: '',
        hyperlinkTitle: '',
        image: { src: 'data:image/png;base64,AAAA', title: '协议状态图', kind: 'image' },
        noteHtml: '<p>均衡器参数</p>',
        comments: [{ id: 'c1', text: '检查接收端', createdAt: 1, updatedAt: 1 }],
      },
    });
    const controller = new StudyPanelController({
      panel: document.createElement('aside'),
      getCards: () => [card],
      getActiveNode: () => null,
      onChange: vi.fn(),
    });
    controller.show('cards');

    for (const term of ['链路训练', '协议状态图', '均衡器参数', '检查接收端']) {
      const input = controller.element.querySelector<HTMLInputElement>('[data-study-search]')!;
      input.value = term;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(controller.element.querySelectorAll('[data-study-card-id]'), term).toHaveLength(1);
    }
  });

  it('creates or locates exactly one card for a node from the node context menu', async () => {
    const panel = document.createElement('aside');
    let cards: StudyCard[] = [];
    const controller = new StudyPanelController({
      panel,
      id: () => 'card-node-1',
      getCards: () => cards,
      getActiveNode: () => ({ uid: 'node-1', text: '节点卡片' }),
      onChange: async (next) => { cards = next; },
    });

    const created = await controller.createCardFromActiveNode();
    const existing = await controller.createCardFromActiveNode();

    expect(created?.id).toBe('card-node-1');
    expect(existing?.id).toBe('card-node-1');
    expect(cards).toHaveLength(1);
    expect(controller.cardForNode('node-1')?.front).toBe('节点卡片');
  });

  it('wires create and edit card actions into the node right-click menu', () => {
    const menuSource = readFileSync('src/ui/contextMenu.ts', 'utf8');
    const editorSource = readFileSync('src/editor/YeMindEditor.ts', 'utf8');
    expect(menuSource).toContain("label: options.hasCard ? '编辑卡片' : '添加到卡片'");
    expect(menuSource).toContain("iconHTML: primaryViewIcon('cards')");
    expect(menuSource).not.toContain("label: '＋ 当前节点'");
    expect(editorSource).toContain('onCreateCard:');
    expect(editorSource).toContain('onEditCard:');
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

  it('routes cards and review through the shared primary navigation state', () => {
    const now = Date.UTC(2026, 6, 28);
    const onNavigate = vi.fn();
    const controller = new StudyPanelController({
      panel: document.createElement('aside'),
      now: () => now,
      getCards: () => [createStudyCard({ id: 'card-1', nodeUid: 'node-1', front: '问题', back: '答案', now })],
      getActiveNode: () => null,
      onChange: vi.fn(),
      onNavigate,
    });
    controller.show('cards');
    controller.element.querySelector<HTMLButtonElement>('[data-study-action="start-review"]')!.click();
    expect(onNavigate).toHaveBeenCalledWith('review', ['card-1']);
  });

  it('switches an active review to cards and locates the reviewed card', () => {
    const now = Date.UTC(2026, 6, 28);
    const onNavigate = vi.fn();
    const controller = new StudyPanelController({
      panel: document.createElement('aside'),
      now: () => now,
      getCards: () => [createStudyCard({ id: 'card-1', nodeUid: 'node-1', front: '问题', back: '答案', now })],
      getActiveNode: () => null,
      onChange: vi.fn(),
      onNavigate,
    });
    controller.show('review', ['card-1']);

    controller.element.querySelector<HTMLButtonElement>('[data-study-action="open-current-card"]')!.click();

    expect(onNavigate).toHaveBeenCalledWith('cards', ['card-1']);
    controller.show('cards', ['card-1']);
    expect(controller.element.querySelector('[data-study-card-id="card-1"]')?.classList.contains('is-located')).toBe(true);
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
