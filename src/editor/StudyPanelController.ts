import {
  createStudyCard,
  normalizeStudyCards,
  rateStudyCard,
  type StudyCard,
  type StudyCardRating,
} from '../review/studyCards';
import { fullscreenIcon } from './projectControls';

export type StudyPanelMode = 'cards' | 'review';

export interface ActiveStudyNode {
  uid: string;
  text: string;
  back?: string;
}

export interface StudyPanelOptions {
  panel: HTMLElement;
  getCards(): StudyCard[];
  getActiveNode(): ActiveStudyNode | null;
  readonly?(): boolean;
  onChange(cards: StudyCard[]): Promise<void> | void;
  onClose?(): void;
  onNavigate?(mode: StudyPanelMode, cardIds?: string[]): void;
  onMessage?(message: string, kind?: 'info' | 'error'): void;
  now?: () => number;
  id?: () => string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function plainText(value: unknown): string {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function statusLabel(status: StudyCard['status']): string {
  if (status === 'mastered') return '已掌握';
  if (status === 'learning') return '学习中';
  return '新卡片';
}

export class StudyPanelController {
  readonly element: HTMLElement;
  private mode: StudyPanelMode = 'cards';
  private filter: StudyCard['status'] | 'all' | 'starred' = 'all';
  private search = '';
  private revealed = false;
  private reviewCardId = '';
  private reviewQueue: string[] = [];
  private locatedCardId = '';
  private reviewCompleted = new Set<string>();
  private flipped = new Set<string>();
  private fullscreen = false;
  private saving = false;
  private optimisticCards: StudyCard[] | null = null;
  private queuedCards: StudyCard[] | null = null;

  constructor(private readonly options: StudyPanelOptions) {
    this.element = options.panel;
    this.element.addEventListener('click', this.onClick);
    this.element.addEventListener('input', this.onInput);
    this.element.addEventListener('change', this.onChange);
  }

  destroy(): void {
    this.element.removeEventListener('click', this.onClick);
    this.element.removeEventListener('input', this.onInput);
    this.element.removeEventListener('change', this.onChange);
  }

  show(mode: StudyPanelMode, requestedCardIds?: string[]): void {
    const modeChanged = this.mode !== mode;
    this.mode = mode;
    this.element.hidden = false;
    this.element.dataset.studyMode = mode;
    this.revealed = false;
    this.reviewCardId = '';
    this.locatedCardId = mode === 'cards' ? String(requestedCardIds?.[0] ?? '') : '';
    if (mode === 'review' && (requestedCardIds || modeChanged || this.reviewQueue.length === 0)) {
      const now = this.options.now?.() ?? Date.now();
      this.reviewQueue = requestedCardIds
        ? requestedCardIds.filter((id) => this.cards().some((card) => card.id === id))
        : this.cards().filter((card) => card.dueAt <= now).map((card) => card.id);
      this.reviewCompleted.clear();
    }
    this.render();
  }

  hide(): void {
    this.element.hidden = true;
  }

  refresh(): void {
    if (!this.element.hidden) this.render();
  }

  private cards(): StudyCard[] {
    return this.optimisticCards ?? normalizeStudyCards(this.options.getCards());
  }

  private render(): void {
    const cards = this.cards();
    this.element.dataset.studyFullscreen = String(this.fullscreen || this.mode === 'review');
    this.element.innerHTML = `
      <header class="ymz-study-panel__header">
        <div>
          <strong>${this.mode === 'review' ? '复习' : '卡片'}</strong>
          <small>${cards.length} 张卡片</small>
        </div>
        ${this.mode === 'cards' ? `<button type="button" data-study-action="fullscreen" title="${this.fullscreen ? '缩小' : '全屏'}" aria-label="${this.fullscreen ? '缩小' : '全屏'}卡片面板">${fullscreenIcon()}</button>` : ''}
        <button type="button" data-study-action="close" title="关闭" aria-label="关闭${this.mode === 'review' ? '复习' : '卡片'}面板">×</button>
      </header>
      ${this.mode === 'review' ? this.renderReview(cards) : this.renderCards(cards)}
    `;
  }

  private renderCards(cards: StudyCard[]): string {
    const activeNode = this.options.getActiveNode();
    const readonly = Boolean(this.options.readonly?.());
    const mastered = cards.filter((card) => card.status === 'mastered').length;
    const learning = cards.filter((card) => card.status === 'learning').length;
    const fresh = cards.length - mastered - learning;
    const progress = cards.length ? Math.round(mastered / cards.length * 100) : 0;
    const filtered = cards.filter((card) => {
      if (this.filter === 'starred' && !card.starred) return false;
      if (
        (this.filter === 'new' || this.filter === 'learning' || this.filter === 'mastered')
        && card.status !== this.filter
      ) return false;
      if (!this.search) return true;
      const haystack = `${card.front}\n${card.back}\n${card.nodeUid}`.toLocaleLowerCase();
      return haystack.includes(this.search.toLocaleLowerCase());
    });
    const filters: Array<[typeof this.filter, string]> = [
      ['all', '全部'],
      ['starred', '收藏'],
      ['new', '新卡片'],
      ['learning', '学习中'],
      ['mastered', '已掌握'],
    ];
    return `
      <section class="ymz-study-progress" data-role="study-progress" aria-label="掌握进度">
        <div><strong>${progress}%</strong><span>掌握进度</span><small>待学 ${fresh} · 学习中 ${learning} · 已掌握 ${mastered}</small></div>
        <i><b style="width:${progress}%"></b></i>
      </section>
      <div class="ymz-study-panel__toolbar">
        <label class="ymz-study-search"><span aria-hidden="true">⌕</span><input data-study-search value="${escapeHtml(this.search)}" placeholder="搜索卡片" aria-label="搜索卡片"></label>
        <button type="button" class="ymz-study-create" data-study-action="create"${activeNode && !readonly ? '' : ' disabled'} title="${readonly ? '只读模式下不能创建卡片' : activeNode ? '从当前选中节点创建卡片' : '请先选中一个导图节点'}">＋ 当前节点</button>
      </div>
      <div class="ymz-study-filters" role="group" aria-label="卡片状态筛选">
        ${filters.map(([value, label]) => `<button type="button" data-study-filter="${value}" class="${this.filter === value ? 'is-active' : ''}" aria-pressed="${this.filter === value}">${label}</button>`).join('')}
      </div>
      ${filtered.length ? `<div class="ymz-study-start"><button type="button" data-study-action="start-review">开始学习 · ${filtered.length} 张卡片 <span aria-hidden="true">→</span></button></div>` : ''}
      <div class="ymz-study-card-list" data-role="study-card-list">
        ${filtered.length ? filtered.map((card) => this.renderCard(card, readonly)).join('') : `
          <div class="ymz-study-empty">
            <strong>${cards.length ? '没有符合条件的卡片' : '还没有卡片'}</strong>
            <span>${activeNode ? '点击“当前节点”创建第一张卡片。' : '先在导图中选中节点，再创建卡片。'}</span>
          </div>
        `}
      </div>
    `;
  }

  private renderCard(card: StudyCard, readonly: boolean): string {
    const flipped = this.flipped.has(card.id);
    const lastReviewed = card.lastReviewedAt
      ? new Date(card.lastReviewedAt).toLocaleDateString('zh-CN')
      : '';
    return `
      <article class="ymz-study-card${card.id === this.locatedCardId ? ' is-located' : ''}" data-study-card-id="${escapeHtml(card.id)}">
        <header>
          <span><i class="ymz-study-source-dot" aria-hidden="true"></i>${escapeHtml(card.nodeUid || '独立卡片')}</span>
          <button type="button" data-study-action="star" aria-pressed="${card.starred}" title="${card.starred ? '取消重点' : '设为重点'}"${readonly ? ' disabled' : ''}>${card.starred ? '★' : '☆'}</button>
        </header>
        <button type="button" class="ymz-study-card__face" data-study-action="flip" data-study-face="${flipped ? 'back' : 'front'}">
          <small>${flipped ? '答案' : '问题'}</small>
          <strong>${escapeHtml(flipped ? card.back || '（尚未填写答案）' : card.front)}</strong>
          <em>点击翻面</em>
        </button>
        <details>
          <summary>编辑卡片</summary>
          <label><span>正面</span><input data-study-field="front" value="${escapeHtml(card.front)}" aria-label="卡片正面"${readonly ? ' disabled' : ''}></label>
          <label><span>背面</span><textarea data-study-field="back" aria-label="卡片背面" placeholder="输入答案或补充内容"${readonly ? ' disabled' : ''}>${escapeHtml(card.back)}</textarea></label>
        </details>
        <div class="ymz-study-card__statuses" role="group" aria-label="卡片状态">
          ${(['new', 'learning', 'mastered'] as const).map((status) => `<button type="button" data-study-status="${status}" class="${card.status === status ? 'is-active' : ''}" aria-pressed="${card.status === status}"${readonly ? ' disabled' : ''}>${statusLabel(status)}</button>`).join('')}
        </div>
        <footer>
          <small>${card.repetitions ? `复习 ${card.repetitions} 次${lastReviewed ? ` · ${lastReviewed}` : ''}` : '尚未复习'}</small>
          <button type="button" data-study-action="delete" class="is-danger"${readonly ? ' disabled' : ''}>删除</button>
        </footer>
      </article>
    `;
  }

  private renderReview(cards: StudyCard[]): string {
    const readonly = Boolean(this.options.readonly?.());
    this.reviewQueue = this.reviewQueue.filter((id) => cards.some((card) => card.id === id));
    let current = cards.find((card) => card.id === this.reviewCardId && this.reviewQueue.includes(card.id));
    if (!current) current = cards.find((card) => card.id === this.reviewQueue[0]);
    this.reviewCardId = current?.id ?? '';
    if (!current) {
      return `
        <div class="ymz-study-review-empty">
          <span class="ymz-study-review-empty__icon" aria-hidden="true">✓</span>
          <strong>本轮复习已完成</strong>
          <span>${cards.length ? '暂无到期卡片，可以回到卡片面板继续整理。' : '创建卡片后会在这里安排复习。'}</span>
          <button type="button" data-study-action="open-cards">查看卡片</button>
        </div>
      `;
    }
    const total = this.reviewCompleted.size + this.reviewQueue.length;
    const progress = total ? Math.round(this.reviewCompleted.size / total * 100) : 0;
    return `
      <div class="ymz-study-review">
        <div class="ymz-study-review__progress"><span>卡片 ${this.reviewCompleted.size + 1} / ${Math.max(1, total)}</span><small>已完成 ${this.reviewCompleted.size} 张 · ${progress}%</small></div>
        <article class="ymz-study-review-card" data-study-card-id="${escapeHtml(current.id)}">
          <div class="ymz-study-review-card__meta">
            <span class="ymz-study-review-card__eyebrow">${current.starred ? '★ 重点卡片' : statusLabel(current.status)}</span>
            <button type="button" data-study-action="open-current-card">查看卡片</button>
          </div>
          <h2>${escapeHtml(current.front)}</h2>
          <div class="ymz-study-review-card__answer" data-role="study-answer"${this.revealed ? '' : ' hidden'}>${escapeHtml(current.back || '（尚未填写答案）')}</div>
          <button type="button" class="ymz-study-reveal" data-study-action="reveal"${this.revealed ? ' hidden' : ''}>显示答案</button>
          <div class="ymz-study-ratings"${this.revealed ? '' : ' hidden'} aria-label="复习评价">
            <button type="button" data-study-rating="again"${readonly ? ' disabled' : ''}><strong>再来一次</strong><small>本轮稍后</small></button>
            <button type="button" data-study-rating="hard"${readonly ? ' disabled' : ''}><strong>有点难</strong><small>1 天</small></button>
            <button type="button" data-study-rating="easy"${readonly ? ' disabled' : ''}><strong>掌握了</strong><small>延长间隔</small></button>
          </div>
        </article>
      </div>
    `;
  }

  private async persist(cards: StudyCard[]): Promise<void> {
    if (this.options.readonly?.()) return;
    const normalizedCards = normalizeStudyCards(cards);
    this.optimisticCards = normalizedCards;
    this.queuedCards = normalizedCards;
    if (this.saving) return;
    this.saving = true;
    this.element.setAttribute('aria-busy', 'true');
    try {
      while (this.queuedCards) {
        const nextCards = this.queuedCards;
        this.queuedCards = null;
        await this.options.onChange(nextCards);
        if (!this.queuedCards) this.optimisticCards = null;
      }
    } catch {
      this.queuedCards = null;
      this.optimisticCards = null;
      this.options.onMessage?.('卡片保存失败，请重试', 'error');
    } finally {
      this.saving = false;
      this.element.removeAttribute('aria-busy');
      this.render();
    }
  }

  private readonly onClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    const action = target.closest<HTMLElement>('[data-study-action]')?.dataset.studyAction;
    const filter = target.closest<HTMLElement>('[data-study-filter]')?.dataset.studyFilter;
    const rating = target.closest<HTMLElement>('[data-study-rating]')?.dataset.studyRating as StudyCardRating | undefined;
    if (filter === 'all' || filter === 'new' || filter === 'learning' || filter === 'mastered') {
      this.filter = filter;
      this.render();
      return;
    }
    if (filter === 'starred') {
      this.filter = filter;
      this.render();
      return;
    }
    if (rating) {
      if (this.options.readonly?.()) return;
      const card = this.cards().find((item) => item.id === this.reviewCardId);
      if (!card) return;
      const reviewed = rateStudyCard(card, rating, this.options.now?.() ?? Date.now());
      this.reviewQueue = this.reviewQueue.filter((id) => id !== reviewed.id);
      if (rating === 'again') this.reviewQueue.push(reviewed.id);
      else this.reviewCompleted.add(reviewed.id);
      this.revealed = false;
      this.reviewCardId = '';
      void this.persist(this.cards().map((item) => item.id === reviewed.id ? reviewed : item));
      return;
    }
    const article = target.closest<HTMLElement>('[data-study-card-id]');
    const id = article?.dataset.studyCardId;
    const status = target.closest<HTMLElement>('[data-study-status]')?.dataset.studyStatus as StudyCard['status'] | undefined;
    if (id && (status === 'new' || status === 'learning' || status === 'mastered')) {
      if (this.options.readonly?.()) return;
      void this.persist(this.cards().map((card) => card.id === id
        ? { ...card, status, updatedAt: this.options.now?.() ?? Date.now() }
        : card));
      return;
    }
    if (!action) return;
    if (action === 'close') {
      this.options.onClose?.();
      return;
    }
    if (action === 'open-cards') {
      this.options.onNavigate?.('cards');
      if (!this.options.onNavigate) this.show('cards');
      return;
    }
    if (action === 'open-current-card') {
      const cardId = this.reviewCardId;
      this.options.onNavigate?.('cards', cardId ? [cardId] : undefined);
      if (!this.options.onNavigate) this.show('cards', cardId ? [cardId] : undefined);
      return;
    }
    if (action === 'fullscreen') {
      this.fullscreen = !this.fullscreen;
      this.render();
      return;
    }
    if (action === 'start-review') {
      const visibleIds = Array.from(this.element.querySelectorAll<HTMLElement>('[data-study-card-id]'))
        .map((item) => item.dataset.studyCardId)
        .filter((id): id is string => Boolean(id));
      this.options.onNavigate?.('review', visibleIds);
      if (!this.options.onNavigate) this.show('review', visibleIds);
      return;
    }
    if (action === 'reveal') {
      this.revealed = true;
      this.render();
      return;
    }
    if (action === 'create') {
      if (this.options.readonly?.()) return;
      const node = this.options.getActiveNode();
      if (!node) {
        this.options.onMessage?.('请先选中一个导图节点');
        return;
      }
      const now = this.options.now?.() ?? Date.now();
      const card = createStudyCard({
        id: this.options.id?.() ?? globalThis.crypto?.randomUUID?.() ?? `card-${now}`,
        nodeUid: node.uid,
        front: plainText(node.text) || '未命名卡片',
        back: plainText(node.back),
        now,
      });
      void this.persist([...this.cards(), card]);
      return;
    }
    if (!id) return;
    if (action === 'flip') {
      if (this.flipped.has(id)) this.flipped.delete(id);
      else this.flipped.add(id);
      this.render();
      return;
    }
    if (action === 'delete') {
      if (this.options.readonly?.()) return;
      void this.persist(this.cards().filter((card) => card.id !== id));
    } else if (action === 'star') {
      if (this.options.readonly?.()) return;
      void this.persist(this.cards().map((card) => card.id === id
        ? { ...card, starred: !card.starred, updatedAt: this.options.now?.() ?? Date.now() }
        : card));
    }
  };

  private readonly onInput = (event: Event): void => {
    const input = (event.target as HTMLElement).closest<HTMLInputElement>('[data-study-search]');
    if (!input) return;
    this.search = input.value;
    this.render();
    this.element.querySelector<HTMLInputElement>('[data-study-search]')?.focus();
  };

  private readonly onChange = (event: Event): void => {
    if (this.options.readonly?.()) return;
    const field = (event.target as HTMLElement).closest<HTMLInputElement | HTMLTextAreaElement>('[data-study-field]');
    const article = field?.closest<HTMLElement>('[data-study-card-id]');
    const id = article?.dataset.studyCardId;
    const key = field?.dataset.studyField;
    if (!field || !id || (key !== 'front' && key !== 'back')) return;
    const value = field.value.trim();
    if (key === 'front' && !value) {
      this.options.onMessage?.('卡片正面不能为空', 'error');
      this.render();
      return;
    }
    void this.persist(this.cards().map((card) => card.id === id
      ? { ...card, [key]: value, updatedAt: this.options.now?.() ?? Date.now() }
      : card));
  };
}
