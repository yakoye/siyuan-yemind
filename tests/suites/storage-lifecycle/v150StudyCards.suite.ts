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
