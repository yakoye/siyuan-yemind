import { execFileSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  classifyDocument,
  formatDocumentTimestamp,
  historicalDocumentTarget,
} from './documentNaming.mjs';

const MANAGED_EXTENSIONS = new Set(['.md', '.txt', '.json']);

function slash(value) {
  return String(value ?? '').replaceAll('\\', '/').replace(/^\.\/+/, '');
}

function gitFirstAddedTimestamp(root, relativePath) {
  try {
    const output = execFileSync(
      'git',
      ['log', '--diff-filter=A', '--follow', '--format=%aI', '--', relativePath],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const dates = output.trim().split(/\r?\n/).filter(Boolean);
    return dates.at(-1) ?? null;
  } catch {
    return null;
  }
}

function filesystemTimestamp(root, relativePath) {
  const stats = statSync(path.join(root, relativePath));
  const created = stats.birthtimeMs > 0 ? stats.birthtime : null;
  const modified = stats.mtimeMs > 0 ? stats.mtime : null;
  if (created && Number.isFinite(created.getTime())) {
    return { timestamp: created.toISOString(), timeSource: 'file-created' };
  }
  if (modified && Number.isFinite(modified.getTime())) {
    return { timestamp: modified.toISOString(), timeSource: 'file-modified' };
  }
  return { timestamp: new Date().toISOString(), timeSource: 'migration' };
}

export function listManagedDocumentPaths(root) {
  const docsRoot = path.join(root, 'docs');
  const result = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
        continue;
      }
      const relativePath = slash(path.relative(root, absolute));
      if (!MANAGED_EXTENSIONS.has(path.extname(relativePath).toLowerCase())) continue;
      if (classifyDocument(relativePath).category === 'unmanaged') continue;
      result.push(relativePath);
    }
  };
  visit(docsRoot);
  return result.sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

export function buildMigrationEntries(root, documentPaths = listManagedDocumentPaths(root)) {
  return [...documentPaths]
    .map(slash)
    .sort((left, right) => left.localeCompare(right, 'zh-CN'))
    .map((oldPath) => {
      const classification = classifyDocument(oldPath);
      const gitTimestamp = gitFirstAddedTimestamp(root, oldPath);
      const fallback = gitTimestamp
        ? { timestamp: gitTimestamp, timeSource: 'git-first-add' }
        : filesystemTimestamp(root, oldPath);
      const fileTimestamp = formatDocumentTimestamp(fallback.timestamp);
      return {
        oldPath,
        newPath: historicalDocumentTarget({
          oldPath,
          timestamp: fallback.timestamp,
          fileTimestamp,
        }),
        timestamp: fallback.timestamp,
        fileTimestamp,
        timeSource: fallback.timeSource,
        category: classification.category,
      };
    })
    .filter((entry) => entry.oldPath !== entry.newPath);
}

export function validateMigrationEntries(entries) {
  const errors = [];
  const oldPaths = new Set();
  const newPaths = new Set();
  for (const entry of entries ?? []) {
    const oldPath = slash(entry?.oldPath);
    const newPath = slash(entry?.newPath);
    if (!oldPath.startsWith('docs/')) errors.push(`unsafe-source:${oldPath}`);
    if (!newPath.startsWith('docs/')) errors.push(`unsafe-target:${newPath}`);
    if (oldPaths.has(oldPath)) errors.push(`duplicate-source:${oldPath}`);
    if (newPaths.has(newPath)) errors.push(`duplicate-target:${newPath}`);
    oldPaths.add(oldPath);
    newPaths.add(newPath);
    if (!/^\d{4}-\d{2}-\d{2}-\d{4}$/.test(String(entry?.fileTimestamp ?? ''))) {
      errors.push(`invalid-file-timestamp:${oldPath}`);
    }
    if (!['git-first-add', 'file-created', 'file-modified', 'migration'].includes(entry?.timeSource)) {
      errors.push(`invalid-time-source:${oldPath}`);
    }
  }
  return [...new Set(errors)].sort();
}

function parseArguments(argv) {
  const result = { mode: '', file: '' };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--write' || argv[index] === '--check') {
      result.mode = argv[index].slice(2);
      result.file = argv[index + 1] ?? '';
      index += 1;
    }
  }
  return result;
}

function runCli() {
  const root = process.cwd();
  const { mode, file } = parseArguments(process.argv.slice(2));
  if (!mode || !file) {
    console.error('Usage: node scripts/docs/generateDocumentMigration.mjs --write|--check <file>');
    process.exitCode = 2;
    return;
  }
  const outputPath = path.resolve(root, file);
  if (mode === 'write') {
    const entries = buildMigrationEntries(root);
    const errors = validateMigrationEntries(entries);
    if (errors.length > 0) {
      console.error(errors.join('\n'));
      process.exitCode = 1;
      return;
    }
    writeFileSync(outputPath, `${JSON.stringify({
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      timeZone: 'Asia/Shanghai',
      entries,
    }, null, 2)}\n`, 'utf8');
    console.log(`[docs:migration] wrote ${entries.length} entries to ${slash(path.relative(root, outputPath))}`);
    return;
  }
  if (!existsSync(outputPath)) {
    console.error(`[docs:migration] missing map: ${slash(path.relative(root, outputPath))}`);
    process.exitCode = 1;
    return;
  }
  const document = JSON.parse(readFileSync(outputPath, 'utf8'));
  const errors = validateMigrationEntries(document?.entries);
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log(`[docs:migration] valid ${document.entries.length} entries`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) runCli();
