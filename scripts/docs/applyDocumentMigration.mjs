import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateMigrationEntries } from './generateDocumentMigration.mjs';

const TEXT_EXTENSIONS = new Set([
  '.cjs', '.css', '.html', '.js', '.json', '.md', '.mjs',
  '.ts', '.tsx', '.txt', '.yaml', '.yml',
]);
const SKIPPED_DIRECTORIES = new Set([
  '.git', 'build', 'dist', 'node_modules', 'release',
]);

function slash(value) {
  return String(value ?? '').replaceAll('\\', '/').replace(/^\.\/+/, '');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isInsideDocs(relativePath) {
  const normalized = slash(relativePath);
  return normalized.startsWith('docs/') && !normalized.includes('../');
}

function listTextFiles(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && SKIPPED_DIRECTORIES.has(entry.name)) continue;
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
        continue;
      }
      const relativePath = slash(path.relative(root, absolutePath));
      if (!TEXT_EXTENSIONS.has(path.extname(relativePath).toLowerCase())) continue;
      if (relativePath === 'docs/document-migration-map.json') continue;
      files.push(relativePath);
    }
  };
  visit(root);
  return files.sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

function relativeReference(fromPath, toPath) {
  const relative = slash(path.posix.relative(path.posix.dirname(fromPath), toPath));
  return relative || path.posix.basename(toPath);
}

function rewriteContent(content, sourcePath, destinationPath, moveMap) {
  let result = content;
  for (const [oldPath, newPath] of moveMap) {
    result = result.replace(
      new RegExp(escapeRegExp(oldPath), 'g'),
      newPath,
    );
    const oldRelative = relativeReference(sourcePath, oldPath);
    const newRelative = relativeReference(destinationPath, newPath);
    result = result.replace(
      new RegExp(`(?<![\\w./-])${escapeRegExp(oldRelative)}(?![\\w./-])`, 'g'),
      newRelative,
    );
  }
  return result;
}

function isTracked(root, relativePath) {
  try {
    execFileSync(
      'git',
      ['ls-files', '--error-unmatch', '--', relativePath],
      { cwd: root, stdio: 'ignore' },
    );
    return true;
  } catch {
    return false;
  }
}

function normalizeEntries(root, entries) {
  const errors = validateMigrationEntries(entries);
  if (errors.length > 0) {
    throw new Error(`Invalid documentation migration:\n${errors.join('\n')}`);
  }
  return entries.map((entry) => {
    const oldPath = slash(entry.oldPath);
    const newPath = slash(entry.newPath);
    if (!isInsideDocs(oldPath) || !isInsideDocs(newPath)) {
      throw new Error(`Unsafe documentation migration: ${oldPath} -> ${newPath}`);
    }
    const source = path.resolve(root, oldPath);
    const target = path.resolve(root, newPath);
    const docsRoot = `${path.resolve(root, 'docs')}${path.sep}`;
    if (!source.startsWith(docsRoot) || !target.startsWith(docsRoot)) {
      throw new Error(`Migration escaped docs root: ${oldPath} -> ${newPath}`);
    }
    if (!existsSync(source)) {
      throw new Error(`Migration source is missing: ${oldPath}`);
    }
    if (existsSync(target) && source !== target) {
      throw new Error(`Migration target already exists: ${newPath}`);
    }
    return { ...entry, oldPath, newPath, source, target };
  });
}

export function applyDocumentMigration(root, entries, options = {}) {
  const apply = options.apply === true;
  const normalized = normalizeEntries(root, entries);
  const moveMap = new Map(
    normalized.map((entry) => [entry.oldPath, entry.newPath]),
  );
  const sourceFiles = listTextFiles(root);
  const rewrites = sourceFiles.flatMap((sourcePath) => {
    const destinationPath = moveMap.get(sourcePath) ?? sourcePath;
    const before = readFileSync(path.join(root, sourcePath), 'utf8');
    const after = rewriteContent(before, sourcePath, destinationPath, moveMap);
    return before === after
      ? []
      : [{ path: destinationPath, sourcePath, before, after }];
  });
  const moves = normalized.map((entry) => ({
    oldPath: entry.oldPath,
    newPath: entry.newPath,
    tracked: isTracked(root, entry.oldPath),
  }));

  if (!apply) {
    return {
      applied: false,
      moves,
      rewrites: rewrites.map(({ path: filePath, sourcePath }) => ({
        path: filePath,
        sourcePath,
      })),
    };
  }

  for (const move of moves) {
    const source = path.join(root, move.oldPath);
    const target = path.join(root, move.newPath);
    mkdirSync(path.dirname(target), { recursive: true });
    if (move.tracked) {
      execFileSync('git', ['mv', '--', move.oldPath, move.newPath], {
        cwd: root,
        stdio: 'inherit',
      });
    } else {
      renameSync(source, target);
    }
  }
  for (const rewrite of rewrites) {
    const absolutePath = path.join(root, rewrite.path);
    if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
      throw new Error(`Rewrite target is missing after migration: ${rewrite.path}`);
    }
    writeFileSync(absolutePath, rewrite.after, 'utf8');
  }

  return {
    applied: true,
    moves,
    rewrites: rewrites.map(({ path: filePath, sourcePath }) => ({
      path: filePath,
      sourcePath,
    })),
  };
}

function parseArguments(argv) {
  const result = { map: '', apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--map') {
      result.map = argv[index + 1] ?? '';
      index += 1;
    } else if (argv[index] === '--apply') {
      result.apply = true;
    } else if (argv[index] === '--dry-run') {
      result.apply = false;
    }
  }
  return result;
}

function runCli() {
  const root = process.cwd();
  const options = parseArguments(process.argv.slice(2));
  if (!options.map) {
    console.error('Usage: node scripts/docs/applyDocumentMigration.mjs --map <file> --dry-run|--apply');
    process.exitCode = 2;
    return;
  }
  const map = JSON.parse(readFileSync(path.resolve(root, options.map), 'utf8'));
  const result = applyDocumentMigration(root, map.entries, {
    apply: options.apply,
  });
  console.log(`[docs:migration] ${result.applied ? 'applied' : 'preview'} ${result.moves.length} moves`);
  console.log(`[docs:migration] ${result.rewrites.length} text files require reference updates`);
  for (const move of result.moves) {
    console.log(`${move.tracked ? 'git mv' : 'rename'} ${move.oldPath} -> ${move.newPath}`);
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : '';
if (invokedPath === import.meta.url) runCli();
