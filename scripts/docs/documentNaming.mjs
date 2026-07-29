import path from 'node:path';

const STANDARD_DOCUMENTS = new Map([
  ['docs/REGRESSION_CHECKLIST.md', '回归验收清单.md'],
  ['docs/superpowers/DEVELOPMENT_REQUIREMENTS.md', '开发要求.md'],
  ['docs/测试与验收.md', '测试与验收.md'],
  ['docs/版本管理.md', '版本管理.md'],
  ['docs/版本与发布规范.md', '版本与发布规范.md'],
  ['docs/VERSIONING.md', '版本语义规范.md'],
  ['docs/DIAGNOSTICS_GUIDE.md', '诊断指南.md'],
]);

const DOCUMENT_TYPES = [
  '设计',
  '实施计划',
  '测试用例',
  '验证记录',
  '验收记录',
  '回归记录',
  '构建清单',
];

function slash(value) {
  return String(value ?? '').replaceAll('\\', '/').replace(/^\.\/+/, '');
}

function basenameWithoutExtension(relativePath) {
  const extension = path.posix.extname(relativePath);
  return path.posix.basename(relativePath, extension);
}

function versionFromPath(relativePath) {
  const match = slash(relativePath).match(/v?(\d+\.\d+\.\d+)/i);
  return match ? `v${match[1]}` : 'dev';
}

function cleanTopic(value) {
  return String(value ?? '')
    .replace(/^\d{4}-\d{2}-\d{2}(?:-\d{4})?-/, '')
    .replace(/^v?\d+\.\d+\.\d+-?/i, '')
    .replace(/^(?:DESIGN|PRODUCT_BOUNDARIES|TEST_COVERAGE_MATRIX|verification|offline-bundle-manifest)[_-]?/i, '')
    .replace(/(?:设计|实施计划|测试用例|版本验证|验证记录|验收记录|回归记录|构建清单)$/u, '')
    .replace(/[_\s]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

function classified(category, targetDirectory, stableName) {
  return {
    category,
    targetDirectory,
    ...(stableName ? { stableName } : {}),
  };
}

export function classifyDocument(inputPath) {
  const relativePath = slash(inputPath);
  const standardName = STANDARD_DOCUMENTS.get(relativePath);
  if (standardName) return classified('standard', 'docs/standards', standardName);

  if (/^docs\/DESIGN_v0\.9\./i.test(relativePath)) {
    return classified('archive-design', 'docs/archive/v0.9/designs');
  }
  if (/^docs\/PRODUCT_BOUNDARIES_v0\.9\./i.test(relativePath)) {
    return classified('archive-boundary', 'docs/archive/v0.9/boundaries');
  }
  if (/^docs\/TEST_COVERAGE_MATRIX_v0\.9\./i.test(relativePath)) {
    return classified('archive-test-matrix', 'docs/archive/v0.9/test-matrices');
  }
  if (/^docs\/verification-v0\.9\./i.test(relativePath)) {
    return classified('archive-verification', 'docs/archive/v0.9/verifications');
  }
  if (/^docs\/offline-bundle-manifest-v0\.9\./i.test(relativePath)) {
    return classified('archive-manifest', 'docs/archive/v0.9/manifests');
  }

  if (/^docs\/superpowers\/specs\//i.test(relativePath)
    || /^docs\/设计-/u.test(relativePath)) {
    return classified('design', 'docs/designs');
  }
  if (/^docs\/superpowers\/plans\//i.test(relativePath)
    || /^docs\/实施计划-/u.test(relativePath)) {
    return classified('plan', 'docs/plans');
  }
  if (/^docs\/regression-runs\/README\.md$/i.test(relativePath)) {
    return classified('regression-index', 'docs/regression-runs', 'README.md');
  }
  if (/^docs\/regression-runs\/.+\.(?:md|txt)$/i.test(relativePath)) {
    return classified('regression-run', 'docs/regression-runs');
  }
  if (/^docs\/测试用例-/u.test(relativePath)) {
    return classified('release-test', `docs/releases/${versionFromPath(relativePath)}`);
  }
  if (/^docs\/(?:版本验证|验证)-/u.test(relativePath)
    || /^docs\/verification-v(?:1|2|3|4|5|6|7|8|9)\./i.test(relativePath)
    || /^docs\/verification-web-/i.test(relativePath)
    || /^docs\/验证记录-/u.test(relativePath)) {
    return classified('release-verification', `docs/releases/${versionFromPath(relativePath)}`);
  }
  if (/^docs\/验收记录-/u.test(relativePath)) {
    return classified('release-acceptance', `docs/releases/${versionFromPath(relativePath)}`);
  }
  if (/^docs\/YeMind_v\d+\.\d+\.\d+.*(?:清单|设计).*\.(?:md|txt)$/iu.test(relativePath)) {
    return classified('release-design', `docs/releases/${versionFromPath(relativePath)}`);
  }

  return classified('unmanaged', path.posix.dirname(relativePath));
}

export function formatDocumentTimestamp(isoDate, timeZone = 'Asia/Shanghai') {
  const date = new Date(isoDate);
  if (!Number.isFinite(date.getTime())) {
    throw new TypeError(`Invalid document timestamp: ${String(isoDate)}`);
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}-${values.hour}${values.minute}`;
}

export function historicalDocumentTarget(entry) {
  const oldPath = slash(entry?.oldPath);
  const classification = classifyDocument(oldPath);
  if (classification.category === 'unmanaged') return oldPath;
  if (classification.category === 'standard' || classification.category === 'regression-index') {
    return path.posix.join(
      classification.targetDirectory,
      classification.stableName ?? path.posix.basename(oldPath),
    );
  }

  const timestamp = String(entry?.fileTimestamp ?? entry?.timestamp ?? '');
  const prefix = /^\d{4}-\d{2}-\d{2}-\d{4}$/.test(timestamp)
    ? timestamp
    : formatDocumentTimestamp(timestamp);
  const version = versionFromPath(oldPath);
  const sourceName = basenameWithoutExtension(oldPath);
  const topic = cleanTopic(sourceName) || classification.category;
  const extension = path.posix.extname(oldPath).toLowerCase();
  const type = classification.category === 'design' || classification.category === 'release-design'
    || classification.category === 'archive-design'
    ? '设计'
    : classification.category === 'plan'
      ? '实施计划'
      : classification.category === 'release-test'
        ? '测试用例'
        : classification.category === 'release-acceptance'
          ? '验收记录'
          : classification.category === 'regression-run'
            ? '回归记录'
            : classification.category === 'archive-manifest'
              ? '构建清单'
              : '验证记录';
  return path.posix.join(
    classification.targetDirectory,
    `${prefix}-${version}-${topic}-${type}${extension}`,
  );
}

export function validateHistoricalDocumentName(fileName) {
  const name = path.posix.basename(slash(fileName));
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}-\d{4}-/.test(name)) {
    errors.push('missing-minute-timestamp');
  }
  const typePattern = DOCUMENT_TYPES.join('|');
  if (!new RegExp(`-(?:v\\d+\\.\\d+\\.\\d+|dev)-.+-(?:${typePattern})\\.(?:md|txt|json)$`, 'u').test(name)) {
    errors.push('missing-version-or-document-type');
  }
  return errors;
}

export function isStableStandardPath(inputPath) {
  const relativePath = slash(inputPath);
  return relativePath.startsWith('docs/standards/')
    && !/\d{4}-\d{2}-\d{2}|v\d+\.\d+\.\d+/i.test(path.posix.basename(relativePath));
}

export const DOCUMENT_STANDARD_PATHS = Object.freeze(
  [...STANDARD_DOCUMENTS.values()].map((name) => `docs/standards/${name}`),
);
