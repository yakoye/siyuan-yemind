import { describe, expect, it } from 'vitest';
import { MapRepository } from '../../../src/model/MapRepository';
import {
  createStudyCard,
  normalizeStudyCards,
  rateStudyCard,
} from '../../../src/review/studyCards';

function memoryStorage(initial: unknown = null) {
  let value = initial;
  return {
    load: async () => value,
    save: async (next: unknown) => { value = structuredClone(next); },
  };
}

describe('v1.5.0 study cards', () => {
  it('creates card data outside the mind-map node tree', () => {
    const card = createStudyCard({
      id: 'card-1',
      nodeUid: 'node-1',
      front: '问题',
      back: '答案',
      now: 1_000,
    });

    expect(card).toMatchObject({
      id: 'card-1',
      nodeUid: 'node-1',
      front: '问题',
      back: '答案',
      status: 'new',
      repetitions: 0,
      intervalDays: 0,
      dueAt: 1_000,
    });
  });

  it('preserves a sanitized complete node snapshot for independent review', () => {
    const card = createStudyCard({
      id: 'card-rich',
      nodeUid: 'node-rich',
      front: 'PCIe 复习',
      back: '备注答案',
      now: 2_000,
      source: {
        version: 1,
        capturedAt: 1_900,
        nodeTextHtml: '<strong>PCIe</strong><script>alert(1)</script><span class="ql-formula" data-value="x^2">x²</span>',
        nodeTextPlain: 'PCIe x²',
        icons: ['priority-1', '', 'priority-1', 'yemarker1_2'],
        tags: ['SerDes', '', 'SerDes', '复习'],
        todo: { checked: true, text: '掌握链路训练' },
        hyperlink: 'https://example.com/pcie',
        hyperlinkTitle: '规范',
        image: {
          src: 'data:image/png;base64,AAAA',
          title: 'PCIe 拓扑',
          kind: 'image',
          width: 640.4,
          height: 360.2,
        },
        noteHtml: '<p>理解 <em>LTSSM</em></p><img src=x onerror=alert(1)>',
        comments: [
          { id: 'comment-1', text: '关注 Recovery', createdAt: 10, updatedAt: 20 },
          { id: '', text: '无编号', createdAt: 0, updatedAt: 0 },
        ],
      },
    } as Parameters<typeof createStudyCard>[0] & { source: Record<string, unknown> });

    expect(card).toMatchObject({
      source: {
        version: 1,
        capturedAt: 1_900,
        nodeTextPlain: 'PCIe x²',
        icons: ['priority-1', 'yemarker1_2'],
        tags: ['SerDes', '复习'],
        todo: { checked: true, text: '掌握链路训练' },
        image: {
          src: 'data:image/png;base64,AAAA',
          title: 'PCIe 拓扑',
          kind: 'image',
          width: 640,
          height: 360,
        },
        comments: [
          { id: 'comment-1', text: '关注 Recovery', createdAt: 10, updatedAt: 20 },
        ],
      },
    });
    expect((card as any).source.nodeTextHtml).toContain('<strong>PCIe</strong>');
    expect((card as any).source.nodeTextHtml).not.toContain('<script');
    expect((card as any).source.noteHtml).not.toContain('onerror');
    expect(rateStudyCard(card, 'good', 3_000)).toMatchObject({ source: card.source });
    expect(normalizeStudyCards([card])).toEqual([card]);
  });

  it('normalizes malformed persisted values without inventing cards', () => {
    expect(normalizeStudyCards(undefined)).toEqual([]);
    expect(normalizeStudyCards([{ id: '', front: '无编号' }, null])).toEqual([]);
    expect(normalizeStudyCards([{
      id: 'ok',
      nodeUid: 4,
      front: '  问题  ',
      back: 3,
      status: 'unknown',
      dueAt: -1,
    }])).toEqual([
      expect.objectContaining({
        id: 'ok',
        nodeUid: '4',
        front: '问题',
        back: '3',
        status: 'new',
        dueAt: 0,
      }),
    ]);
  });

  it('schedules again, hard, good and easy reviews deterministically', () => {
    const now = Date.UTC(2026, 6, 28);
    const original = createStudyCard({
      id: 'card-1',
      nodeUid: 'node-1',
      front: '问题',
      now,
    });

    expect(rateStudyCard(original, 'again', now)).toMatchObject({
      status: 'learning',
      repetitions: 0,
      lapses: 1,
      dueAt: now + 10 * 60 * 1_000,
    });
    expect(rateStudyCard(original, 'hard', now)).toMatchObject({
      status: 'learning',
      repetitions: 1,
      intervalDays: 1,
      dueAt: now + 24 * 60 * 60 * 1_000,
    });
    expect(rateStudyCard(original, 'good', now)).toMatchObject({
      status: 'learning',
      repetitions: 1,
      intervalDays: 1,
    });
    expect(rateStudyCard(original, 'easy', now)).toMatchObject({
      status: 'learning',
      repetitions: 1,
      intervalDays: 4,
    });
  });

  it('persists card changes through the same repository transaction queue', async () => {
    const repository = new MapRepository(memoryStorage(), {
      id: () => 'map-1',
      now: () => 2_000,
    });
    await repository.load();
    const map = await repository.create('复习导图');
    const card = createStudyCard({
      id: 'card-1',
      nodeUid: 'root',
      front: '中心主题',
      now: 2_000,
    });

    await repository.update(map.id, { studyCards: [card] });

    expect(repository.get(map.id)?.studyCards).toEqual([card]);
    expect(repository.get(map.id)?.data.data).not.toHaveProperty('studyCards');
  });
});
