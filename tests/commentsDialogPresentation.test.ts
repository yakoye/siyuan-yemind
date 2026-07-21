import { describe, expect, it } from 'vitest';
import {
  buildCommentsListHtml,
  formatCommentTimestamp,
  requestClearAllComments,
} from '../src/ui/commentsPresentation';

describe('comments dialog presentation', () => {
  it('shows an explicit empty state when the node has no comments', () => {
    expect(buildCommentsListHtml([])).toContain('暂无批注');
  });

  it('renders timestamps, content, and vertical edit/delete actions for each comment', () => {
    const timestamp = Date.UTC(2026, 6, 16, 11, 36, 5);
    const html = buildCommentsListHtml([
      { id: 'c1', text: '检查串行数据回并行', createdAt: timestamp, updatedAt: timestamp },
    ]);

    expect(html).toContain(formatCommentTimestamp(timestamp));
    expect(html).toContain('检查串行数据回并行');
    expect(html).toContain('ymz-comment__actions');
    expect(html).toContain('data-action="edit-comment"');
    expect(html).toContain('data-action="delete-comment"');
  });

  it('requires confirmation before clearing every comment', () => {
    let confirmed: (() => void) | null = null;
    let cleared = false;
    requestClearAllComments((_title, _message, callback) => { confirmed = callback; }, () => { cleared = true; });

    expect(cleared).toBe(false);
    confirmed?.();
    expect(cleared).toBe(true);
  });
});
