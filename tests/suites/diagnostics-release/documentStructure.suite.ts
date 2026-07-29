import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  classifyDocument,
  formatDocumentTimestamp,
  historicalDocumentTarget,
  isStableStandardPath,
  validateHistoricalDocumentName,
} from '../../../scripts/docs/documentNaming.mjs';
import {
  buildMigrationEntries,
  validateMigrationEntries,
} from '../../../scripts/docs/generateDocumentMigration.mjs';

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

  it('removes duplicated source prefixes and versions from organized names', () => {
    expect(historicalDocumentTarget({
      oldPath: 'docs/设计-v1.1.0-布局与大纲交互.md',
      fileTimestamp: '2026-07-29-1914',
    })).toBe(
      'docs/designs/2026-07-29-1914-v1.1.0-布局与大纲交互-设计.md',
    );
    expect(historicalDocumentTarget({
      oldPath: 'docs/DESIGN_v0.9.31_THEME_PALETTE_DROPDOWN.md',
      fileTimestamp: '2026-07-29-1914',
    })).toBe(
      'docs/archive/v0.9/designs/2026-07-29-1914-v0.9.31-THEME-PALETTE-DROPDOWN-设计.md',
    );
  });

  it('uses explicit document types for archived boundaries and test matrices', () => {
    expect(historicalDocumentTarget({
      oldPath: 'docs/PRODUCT_BOUNDARIES_v0.9.31.md',
      fileTimestamp: '2026-07-29-1914',
    })).toBe(
      'docs/archive/v0.9/boundaries/2026-07-29-1914-v0.9.31-版本-产品边界.md',
    );
    expect(historicalDocumentTarget({
      oldPath: 'docs/TEST_COVERAGE_MATRIX_v0.9.31.md',
      fileTimestamp: '2026-07-29-1914',
    })).toBe(
      'docs/archive/v0.9/test-matrices/2026-07-29-1914-v0.9.31-版本-测试矩阵.md',
    );
  });

  it('uses a readable Chinese fallback when the source has no topic', () => {
    expect(historicalDocumentTarget({
      oldPath: 'docs/实施计划-v1.5.0.md',
      fileTimestamp: '2026-07-29-1914',
    })).toBe(
      'docs/plans/2026-07-29-1914-v1.5.0-版本-实施计划.md',
    );
    expect(historicalDocumentTarget({
      oldPath: 'docs/验收记录-v1.5.0.md',
      fileTimestamp: '2026-07-29-1914',
    })).toBe(
      'docs/releases/v1.5.0/2026-07-29-1914-v1.5.0-版本-验收记录.md',
    );
  });
});

describe('documentation migration inventory', () => {
  it('derives historical names from the first Git add timestamp', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'yemind-doc-migration-'));
    try {
      mkdirSync(path.join(root, 'docs'), { recursive: true });
      writeFileSync(
        path.join(root, 'docs', 'verification-v1.0.0.md'),
        '# Release verification\n',
      );
      execFileSync('git', ['init'], { cwd: root });
      execFileSync('git', ['config', 'user.email', 'tests@example.com'], { cwd: root });
      execFileSync('git', ['config', 'user.name', 'YeMind Tests'], { cwd: root });
      execFileSync('git', ['add', 'docs/verification-v1.0.0.md'], { cwd: root });
      execFileSync('git', ['commit', '-m', 'add verification'], {
        cwd: root,
        env: {
          ...process.env,
          GIT_AUTHOR_DATE: '2026-07-29T11:14:30.000Z',
          GIT_COMMITTER_DATE: '2026-07-29T11:14:30.000Z',
        },
      });

      const entries = buildMigrationEntries(root, [
        'docs/verification-v1.0.0.md',
      ]);

      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        oldPath: 'docs/verification-v1.0.0.md',
        category: 'release-verification',
        timeSource: 'git-first-add',
        fileTimestamp: '2026-07-29-1914',
      });
      expect(entries[0].newPath).toMatch(
        /^docs\/releases\/v1\.0\.0\/2026-07-29-1914-v1\.0\.0-.+-验证记录\.md$/,
      );
      expect(validateMigrationEntries(entries)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects colliding destinations before any files are moved', () => {
    const errors = validateMigrationEntries([
      {
        oldPath: 'docs/a.md',
        newPath: 'docs/designs/shared.md',
        category: 'design',
        timestamp: '2026-07-29T11:14:30.000Z',
        fileTimestamp: '2026-07-29-1914',
        timeSource: 'git-first-add',
      },
      {
        oldPath: 'docs/b.md',
        newPath: 'docs/designs/shared.md',
        category: 'design',
        timestamp: '2026-07-29T11:15:30.000Z',
        fileTimestamp: '2026-07-29-1915',
        timeSource: 'git-first-add',
      },
    ]);
    expect(errors).toContain('duplicate-target:docs/designs/shared.md');
  });
});
