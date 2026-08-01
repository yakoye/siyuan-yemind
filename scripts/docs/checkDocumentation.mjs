import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  isStableStandardPath,
  validateHistoricalDocumentName,
} from './documentNaming.mjs';

const TEXT_EXTENSIONS = new Set([
  '.cjs', '.css', '.html', '.js', '.json', '.md', '.mjs',
  '.ts', '.tsx', '.txt', '.yaml', '.yml',
]);
const SKIPPED_DIRECTORIES = new Set([
  '.agents', '.claude', '.git', '.worktrees', 'build', 'dist', 'node_modules', 'release', 'web-dist',
]);
const STALE_PATH_EXCLUSIONS = new Set([
  'docs/document-migration-map.json',
  'tests/suites/diagnostics-release/documentStructure.suite.ts',
]);

function slash(value) {
  return String(value ?? '').replaceAll('\\', '/').replace(/^\.\/+/, '');
}

function listFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
      } else {
        files.push(slash(path.relative(root, absolutePath)));
      }
    }
  };
  visit(root);
  return files.sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

function isHistoricalDocument(relativePath) {
  const normalized = slash(relativePath);
  if (/^docs\/(?:designs|plans)\//i.test(normalized)) return true;
  if (/^docs\/releases\/[^/]+\//i.test(normalized)) return true;
  if (/^docs\/archive\/v0\.9\/(?:designs|boundaries|test-matrices|verifications|manifests)\//i.test(normalized)) {
    return true;
  }
  return /^docs\/regression-runs\/(?!README\.md$).+\.(?:md|txt)$/iu.test(normalized);
}

function localMarkdownTargets(content) {
  const result = [];
  const pattern = /!?\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  for (const match of content.matchAll(pattern)) {
    let target = match[1].trim().replace(/^<|>$/g, '');
    if (!target || target.startsWith('#') || target.startsWith('/')) continue;
    if (/^(?:https?|mailto|data|javascript):/i.test(target)) continue;
    target = target.split('#', 1)[0].split('?', 1)[0];
    if (!target) continue;
    try {
      target = decodeURIComponent(target);
    } catch {
      // Keep the literal path so a malformed encoded link is reported as broken.
    }
    result.push(target);
  }
  return result;
}

function readMigrationOldPaths(root) {
  const mapPath = path.join(root, 'docs', 'document-migration-map.json');
  if (!existsSync(mapPath)) return [];
  try {
    const document = JSON.parse(readFileSync(mapPath, 'utf8'));
    return (document.entries ?? [])
      .map((entry) => slash(entry?.oldPath))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function checkDocumentation(root = process.cwd()) {
  const errors = [];
  const files = listFiles(root);
  const fileSet = new Set(files);

  for (const relativePath of files) {
    if (relativePath.startsWith('docs/standards/')
      && /\.(?:md|txt)$/iu.test(relativePath)
      && !isStableStandardPath(relativePath)) {
      errors.push({
        code: 'invalid-standard-name',
        path: relativePath,
        message: '长期规范不得包含日期或版本号',
      });
    }
    if (isHistoricalDocument(relativePath)) {
      for (const reason of validateHistoricalDocumentName(relativePath)) {
        errors.push({
          code: 'invalid-history-name',
          path: relativePath,
          message: reason,
        });
      }
    }
  }

  for (const relativePath of files.filter((file) => file.endsWith('.md'))) {
    const content = readFileSync(path.join(root, relativePath), 'utf8');
    for (const target of localMarkdownTargets(content)) {
      const resolved = slash(path.posix.normalize(
        path.posix.join(path.posix.dirname(relativePath), slash(target)),
      ));
      if (resolved.startsWith('../')) continue;
      if (!fileSet.has(resolved) && !existsSync(path.join(root, resolved))) {
        errors.push({
          code: 'broken-local-link',
          path: relativePath,
          target,
          message: `本地链接不存在：${target}`,
        });
      }
    }
  }

  const oldPaths = readMigrationOldPaths(root);
  if (oldPaths.length > 0) {
    for (const relativePath of files) {
      if (STALE_PATH_EXCLUSIONS.has(relativePath)) continue;
      if (!TEXT_EXTENSIONS.has(path.extname(relativePath).toLowerCase())) continue;
      const content = readFileSync(path.join(root, relativePath), 'utf8');
      for (const oldPath of oldPaths) {
        if (!content.includes(oldPath)) continue;
        errors.push({
          code: 'stale-migrated-path',
          path: relativePath,
          target: oldPath,
          message: `仍引用迁移前路径：${oldPath}`,
        });
      }
    }
  }

  return errors.sort((left, right) => (
    left.path.localeCompare(right.path, 'zh-CN')
    || left.code.localeCompare(right.code)
    || String(left.target ?? '').localeCompare(String(right.target ?? ''), 'zh-CN')
  ));
}

function runCli() {
  const errors = checkDocumentation(process.cwd());
  if (errors.length === 0) {
    console.log('[docs:check] documentation paths, names and local links are valid');
    return;
  }
  for (const error of errors) {
    console.error(`[${error.code}] ${error.path}: ${error.message}`);
  }
  console.error(`[docs:check] ${errors.length} error(s)`);
  process.exitCode = 1;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : '';
if (invokedPath === import.meta.url) runCli();
