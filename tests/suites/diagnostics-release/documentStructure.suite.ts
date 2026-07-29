import { describe, expect, it } from 'vitest';
import {
  classifyDocument,
  formatDocumentTimestamp,
  isStableStandardPath,
  validateHistoricalDocumentName,
} from '../../../scripts/docs/documentNaming.mjs';

describe('documentation naming and classification', () => {
  it('keeps long-lived standards on stable Chinese paths', () => {
    expect(classifyDocument('docs/版本与发布规范.md')).toEqual({
      category: 'standard',
      targetDirectory: 'docs/standards',
      stableName: '版本与发布规范.md',
    });
    expect(isStableStandardPath('docs/standards/版本与发布规范.md')).toBe(true);
    expect(isStableStandardPath('docs/releases/v1.5.1/版本与发布规范.md')).toBe(false);
  });

  it('classifies v0.9 verification and build evidence into the archive', () => {
    expect(classifyDocument('docs/verification-v0.9.31.md').category)
      .toBe('archive-verification');
    expect(classifyDocument('docs/offline-bundle-manifest-v0.9.31.json').category)
      .toBe('archive-manifest');
  });

  it('classifies current designs, plans, releases, and regression runs', () => {
    expect(classifyDocument(
      'docs/superpowers/specs/2026-07-29-基础编辑事务闭环与符号面板重构设计.md',
    ).category).toBe('design');
    expect(classifyDocument(
      'docs/superpowers/plans/2026-07-29-基础编辑事务与剪贴板重构.md',
    ).category).toBe('plan');
    expect(classifyDocument('docs/验收记录-v1.5.1.md').category)
      .toBe('release-acceptance');
    expect(classifyDocument(
      'docs/regression-runs/2026-07-29-1.5.1-基础编辑事务闭环与符号面板.md',
    ).category).toBe('regression-run');
  });

  it('formats Git timestamps in Asia/Shanghai with minute precision', () => {
    expect(formatDocumentTimestamp(
      '2026-07-29T11:14:30.000Z',
      'Asia/Shanghai',
    )).toBe('2026-07-29-1914');
  });

  it('accepts the canonical historical name and rejects incomplete names', () => {
    expect(validateHistoricalDocumentName(
      '2026-07-29-1914-v1.5.1-基础编辑事务-验证记录.md',
    )).toEqual([]);
    expect(validateHistoricalDocumentName(
      '2026-07-29-v1.5.1-基础编辑事务-验证记录.md',
    )).toContain('missing-minute-timestamp');
    expect(validateHistoricalDocumentName(
      '2026-07-29-1914-基础编辑事务.md',
    )).toContain('missing-version-or-document-type');
  });
});
