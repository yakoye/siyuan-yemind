import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export interface SourceBuildIdentity {
  id: string;
  time: string;
}

const SOURCE_PATHS = [
  'src',
  'web',
  'assets',
  'vendor',
  'build',
  'scripts',
  'package.json',
  'package-lock.json',
  'plugin.json',
  'icon.png',
  'vite.config.ts',
  'vite.web.config.ts',
] as const;

function git(root: string, args: string[]): string {
  try {
    return execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function listChangedFiles(root: string): string[] {
  const tracked = git(root, ['diff', '--name-only', 'HEAD', '--', ...SOURCE_PATHS])
    .split(/\r?\n/)
    .filter(Boolean);
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard', '--', ...SOURCE_PATHS])
    .split(/\r?\n/)
    .filter(Boolean);
  return [...new Set([...tracked, ...untracked])].sort();
}

function latestSourceTime(root: string, files: string[], fallback: string): string {
  let latest = 0;
  for (const file of files) {
    try {
      latest = Math.max(latest, statSync(resolve(root, file)).mtimeMs);
    } catch {
      // Deleted and renamed files are represented by the source fingerprint already.
    }
  }
  return latest > 0 ? new Date(latest).toISOString() : fallback;
}

export function resolveSourceBuildIdentity(root: string): SourceBuildIdentity {
  const commit = git(root, ['rev-parse', '--short=8', 'HEAD']) || 'local';
  const commitTime = git(root, ['show', '-s', '--format=%cI', 'HEAD'])
    || new Date().toISOString();
  const status = git(root, [
    'status',
    '--porcelain=v1',
    '--untracked-files=all',
    '--',
    ...SOURCE_PATHS,
  ]);
  if (!status) {
    return { id: commit === 'local' ? 'local' : `${commit}-clean`, time: commitTime };
  }

  const files = listChangedFiles(root);
  const hash = createHash('sha256');
  hash.update(commit);
  hash.update('\0');
  hash.update(git(root, ['diff', '--binary', 'HEAD', '--', ...SOURCE_PATHS]));
  for (const file of files) {
    hash.update('\0');
    hash.update(file);
    try {
      hash.update('\0');
      hash.update(readFileSync(resolve(root, file)));
    } catch {
      hash.update('\0deleted');
    }
  }
  return {
    id: `${commit}-dirty-${hash.digest('hex').slice(0, 8)}`,
    time: latestSourceTime(root, files, commitTime),
  };
}

export function createSourceBuildDefines(identity: SourceBuildIdentity): Record<string, string> {
  return {
    __YEMIND_SOURCE_BUILD_ID__: JSON.stringify(identity.id),
    __YEMIND_SOURCE_BUILD_TIME__: JSON.stringify(identity.time),
  };
}
