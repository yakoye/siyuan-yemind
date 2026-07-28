export type StudyCardStatus = 'new' | 'learning' | 'mastered';
export type StudyCardRating = 'again' | 'hard' | 'good' | 'easy';

export interface StudyCard {
  id: string;
  nodeUid: string;
  front: string;
  back: string;
  status: StudyCardStatus;
  starred: boolean;
  createdAt: number;
  updatedAt: number;
  lastReviewedAt?: number;
  dueAt: number;
  repetitions: number;
  lapses: number;
  intervalDays: number;
  easeFactor: number;
}

export interface CreateStudyCardInput {
  id: string;
  nodeUid: string;
  front: string;
  back?: string;
  now?: number;
}

const DAY_MS = 24 * 60 * 60 * 1_000;
const AGAIN_DELAY_MS = 10 * 60 * 1_000;

function finiteNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nonNegativeInteger(value: unknown, fallback = 0): number {
  return Math.max(0, Math.round(finiteNumber(value, fallback)));
}

function normalizeStatus(value: unknown): StudyCardStatus {
  return value === 'learning' || value === 'mastered' ? value : 'new';
}

export function createStudyCard(input: CreateStudyCardInput): StudyCard {
  const now = finiteNumber(input.now, Date.now());
  return {
    id: String(input.id).trim(),
    nodeUid: String(input.nodeUid).trim(),
    front: String(input.front).trim(),
    back: String(input.back ?? '').trim(),
    status: 'new',
    starred: false,
    createdAt: now,
    updatedAt: now,
    dueAt: now,
    repetitions: 0,
    lapses: 0,
    intervalDays: 0,
    easeFactor: 2.5,
  };
}

export function normalizeStudyCards(value: unknown): StudyCard[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const source = item as Partial<Record<keyof StudyCard, unknown>>;
    const id = String(source.id ?? '').trim();
    const front = String(source.front ?? '').trim();
    if (!id || !front) return [];
    const createdAt = Math.max(0, finiteNumber(source.createdAt));
    const updatedAt = Math.max(createdAt, finiteNumber(source.updatedAt, createdAt));
    const lastReviewedAt = finiteNumber(source.lastReviewedAt, -1);
    const card: StudyCard = {
      id,
      nodeUid: String(source.nodeUid ?? '').trim(),
      front,
      back: String(source.back ?? '').trim(),
      status: normalizeStatus(source.status),
      starred: source.starred === true,
      createdAt,
      updatedAt,
      dueAt: Math.max(0, finiteNumber(source.dueAt)),
      repetitions: nonNegativeInteger(source.repetitions),
      lapses: nonNegativeInteger(source.lapses),
      intervalDays: nonNegativeInteger(source.intervalDays),
      easeFactor: Math.min(3, Math.max(1.3, finiteNumber(source.easeFactor, 2.5))),
    };
    if (lastReviewedAt >= 0) card.lastReviewedAt = lastReviewedAt;
    return [card];
  });
}

export function rateStudyCard(
  source: StudyCard,
  rating: StudyCardRating,
  reviewedAt = Date.now(),
): StudyCard {
  const card = normalizeStudyCards([source])[0] ?? createStudyCard({
    id: source.id,
    nodeUid: source.nodeUid,
    front: source.front,
    back: source.back,
    now: reviewedAt,
  });
  if (rating === 'again') {
    return {
      ...card,
      status: 'learning',
      repetitions: 0,
      lapses: card.lapses + 1,
      intervalDays: 0,
      easeFactor: Math.max(1.3, card.easeFactor - 0.2),
      lastReviewedAt: reviewedAt,
      dueAt: reviewedAt + AGAIN_DELAY_MS,
      updatedAt: reviewedAt,
    };
  }

  const repetitions = card.repetitions + 1;
  let intervalDays: number;
  let easeFactor = card.easeFactor;
  if (rating === 'hard') {
    intervalDays = Math.max(1, Math.round((card.intervalDays || 1) * 1.2));
    easeFactor = Math.max(1.3, easeFactor - 0.15);
  } else if (rating === 'easy') {
    intervalDays = card.repetitions === 0
      ? 4
      : Math.max(4, Math.round((card.intervalDays || 1) * easeFactor * 1.3));
    easeFactor = Math.min(3, easeFactor + 0.15);
  } else if (card.repetitions === 0) {
    intervalDays = 1;
  } else if (card.repetitions === 1) {
    intervalDays = 3;
  } else {
    intervalDays = Math.max(1, Math.round(card.intervalDays * easeFactor));
  }

  return {
    ...card,
    status: repetitions >= 3 ? 'mastered' : 'learning',
    repetitions,
    intervalDays,
    easeFactor,
    lastReviewedAt: reviewedAt,
    dueAt: reviewedAt + intervalDays * DAY_MS,
    updatedAt: reviewedAt,
  };
}
