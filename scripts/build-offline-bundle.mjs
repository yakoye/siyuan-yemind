import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require('typescript');
} catch {
  ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mapPath = path.join(root, 'docs', 'build-input', 'v0.9.0-index.js.map');
const sourceMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const sources = new Map();

const canonical = (value) => {
  let normalized = value.replaceAll('\\', '/');
  if (normalized.startsWith('../')) normalized = normalized.slice(2);
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  return path.posix.normalize(normalized);
};

for (let index = 0; index < sourceMap.sources.length; index += 1) {
  const content = sourceMap.sourcesContent[index];
  if (typeof content === 'string') sources.set(canonical(sourceMap.sources[index]), content);
}

const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(?:ts|js|mjs)$/.test(entry.name)) {
      const relative = path.relative(root, full).replaceAll('\\', '/');
      sources.set(canonical(relative), fs.readFileSync(full, 'utf8'));
    }
  }
};
walk(path.join(root, 'src'));
const offlineTestsDir = path.join(root, 'tests', 'offline');
if (fs.existsSync(offlineTestsDir)) walk(offlineTestsDir);

const synthetic = new Map([
  ['/node_modules/lodash-es/index.js', `import cloneDeep from 'lodash.clonedeep';\nimport isEqual from 'lodash.isequal';\nconst isObject = value => value !== null && typeof value === 'object';\nexport function merge(target, ...sources) {\n  if (!isObject(target)) target = {};\n  for (const source of sources) {\n    if (!isObject(source)) continue;\n    for (const key of Reflect.ownKeys(source)) {\n      const value = source[key];\n      if (Array.isArray(value)) {\n        const base = Array.isArray(target[key]) ? target[key] : [];\n        target[key] = merge(base, value);\n      } else if (isObject(value)) {\n        const base = isObject(target[key]) && !Array.isArray(target[key]) ? target[key] : {};\n        target[key] = merge(base, value);\n      } else {\n        target[key] = value;\n      }\n    }\n  }\n  return target;\n}\nexport { cloneDeep, isEqual };\n`],
  ['/node_modules/uuid/index.js', `export { default as v4 } from './dist/esm-browser/v4.js';\n`],
  ['/node_modules/uuid/dist/esm-browser/validate.js', `const REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;\nexport default function validate(value) { return typeof value === 'string' && REGEX.test(value); }\n`],
  ['/node_modules/simple-mind-map/package.json', `export default { name: 'simple-mind-map', version: '0.14.0-fix.3' };\n`],
  ['/node_modules/quill-delta/index.js', `export { default } from './dist/Delta.js';\nexport { default as AttributeMap } from './dist/AttributeMap.js';\nexport { default as Op } from './dist/Op.js';\nexport { default as OpIterator } from './dist/OpIterator.js';\n`],
  ['/virtual/empty.js', 'module.exports = {};\n'],
]);
for (const [name, content] of synthetic) sources.set(name, content);

const packageEntries = new Map([
  ['@svgdotjs/svg.js', 'dist/svg.esm.js'],
  ['deepmerge', 'dist/es.js'],
  ['eventemitter3', 'index.js'],
  ['fast-diff', 'diff.js'],
  ['jszip', 'dist/jszip.min.js'],
  ['katex', 'dist/katex.mjs'],
  ['lodash-es', 'index.js'],
  ['lodash.clonedeep', 'index.js'],
  ['lodash.isequal', 'index.js'],
  ['parchment', 'dist/parchment.js'],
  ['quill', 'quill.js'],
  ['quill-delta', 'index.js'],
  ['simple-mind-map', 'index.js'],
  ['uuid', 'index.js'],
]);

const exists = (candidate) => sources.has(candidate);
const withExtensions = (candidate) => {
  candidate = candidate.length > 1 ? candidate.replace(/\/$/, '') : candidate;
  const checks = [candidate, `${candidate}.ts`, `${candidate}.js`, `${candidate}.mjs`, `${candidate}.json`, `${candidate}/index.ts`, `${candidate}/index.js`, `${candidate}/index.mjs`];
  return checks.find(exists) ?? null;
};

const splitPackage = (specifier) => {
  const parts = specifier.split('/');
  if (specifier.startsWith('@')) return { packageName: `${parts[0]}/${parts[1]}`, subpath: parts.slice(2).join('/') };
  return { packageName: parts[0], subpath: parts.slice(1).join('/') };
};

const nodeModulesRoots = (importer) => {
  const roots = [];
  let current = path.posix.dirname(importer);
  while (current !== '/') {
    roots.push(`${current}/node_modules`);
    current = path.posix.dirname(current);
  }
  roots.push('/node_modules');
  return [...new Set(roots)];
};

function resolveSpecifier(importer, specifier) {
  if (specifier === 'siyuan' || specifier.startsWith('node:')) return { external: specifier };
  if (/\.css(?:\?|$)/.test(specifier)) return { internal: '/virtual/empty.js' };
  if (specifier.startsWith('.')) {
    const resolved = withExtensions(path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier)));
    if (!resolved) throw new Error(`Cannot resolve ${specifier} from ${importer}`);
    return { internal: resolved };
  }
  const { packageName, subpath } = splitPackage(specifier);
  for (const modulesRoot of nodeModulesRoots(importer)) {
    const packageRoot = `${modulesRoot}/${packageName}`;
    let candidate;
    if (subpath) candidate = withExtensions(`${packageRoot}/${subpath}`);
    else candidate = withExtensions(`${packageRoot}/${packageEntries.get(packageName) ?? 'index.js'}`);
    if (candidate) return { internal: candidate };
  }
  if (specifier === 'util') return { external: specifier };
  throw new Error(`Cannot resolve bare specifier ${specifier} from ${importer}`);
}

const ids = new Map();
const modules = [];
const entry = process.env.YEMIND_BUNDLE_ENTRY ? canonical(process.env.YEMIND_BUNDLE_ENTRY) : '/src/index.ts';

function addModule(modulePath) {
  if (ids.has(modulePath)) return ids.get(modulePath);
  const id = modules.length;
  ids.set(modulePath, id);
  modules.push(null);
  const source = sources.get(modulePath);
  if (typeof source !== 'string') throw new Error(`Missing source: ${modulePath}`);
  let output;
  try {
    output = ts.transpileModule(source, {
    fileName: /\.(?:json|mjs)$/.test(modulePath) ? `${modulePath}.js` : modulePath,
    compilerOptions: {
      allowJs: true,
      checkJs: false,
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      target: ts.ScriptTarget.ES2022,
      sourceMap: false,
      inlineSourceMap: false,
      removeComments: false,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      useDefineForClassFields: false,
    },
    reportDiagnostics: true,
    });
  } catch (error) {
    throw new Error(`Transpile exception for ${modulePath}: ${error instanceof Error ? error.stack : String(error)}`);
  }
  if (output.diagnostics?.length) {
    const errors = output.diagnostics.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
    if (errors.length) {
      const text = errors.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')).join('\n');
      throw new Error(`Transpile failed for ${modulePath}:\n${text}`);
    }
  }
  let code = output.outputText;
  code = code.replace(/\brequire\((['"])([^'"]+)\1\)/g, (match, _quote, specifier) => {
    const resolved = resolveSpecifier(modulePath, specifier);
    if (resolved.external) return `__externalRequire(${JSON.stringify(resolved.external)})`;
    return `__require(${addModule(resolved.internal)})`;
  });
  modules[id] = { path: modulePath, code };
  return id;
}

const entryId = addModule(entry);
const banner = `"use strict";\n// YeMind v0.9.4 offline release bundle. Generated from current source and the v0.9.0 verified dependency Source Map.\n`;
const moduleTable = modules.map((module, id) => `${JSON.stringify(id)}: function(module, exports, __require, __externalRequire) {\n// ${module.path}\n${module.code}\n}`).join(',\n');
const bundle = `${banner}const __modules = {\n${moduleTable}\n};\nconst __cache = Object.create(null);\nfunction __require(id) {\n  if (__cache[id]) return __cache[id].exports;\n  const factory = __modules[id];\n  if (!factory) throw new Error('Unknown bundled module: ' + id);\n  const module = __cache[id] = { exports: {} };\n  factory(module, module.exports, __require, __externalRequire);\n  return module.exports;\n}\nfunction __externalRequire(name) { return require(name); }\nconst __entry = __require(${entryId});\nmodule.exports = __entry && Object.prototype.hasOwnProperty.call(__entry, 'default') ? __entry.default : __entry;\n`;

const outputPath = path.resolve(root, process.env.YEMIND_BUNDLE_OUTPUT ?? 'index.js');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, bundle);
const manifest = {
  entry,
  moduleCount: modules.length,
  sourceMapBase: path.basename(mapPath),
  modules: modules.map((module, id) => ({ id, path: module.path })),
};
const manifestPath = path.resolve(root, process.env.YEMIND_BUNDLE_MANIFEST ?? 'docs/offline-bundle-manifest-v0.9.4.json');
fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Built ${path.relative(process.cwd(), outputPath)} with ${modules.length} modules.`);
