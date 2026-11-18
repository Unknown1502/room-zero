import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(root, 'src');
const runtimeSdkRoots = ['app/', 'systems/', 'world/', 'components/'];
const runtimeSdkFiles = new Set(['assets.ts', 'components.ts', 'index.ts']);
const bannedLoopCalls = new Set(['requestAnimationFrame', 'setAnimationLoop', 'setInterval', 'setTimeout']);
const browserGlobals = new Set(['window', 'document', 'navigator', 'fetch', 'localStorage', 'indexedDB']);
const files = [];
const failures = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && /\.tsx?$/.test(entry.name)) files.push(full);
  }
}

function sourcePath(file) {
  return `${path.relative(sourceRoot, file).split(path.sep).join('/')}`;
}

function resolvedLocalPath(fromFile, specifier) {
  const target = path.resolve(path.dirname(fromFile), specifier).replace(/\.(?:js|jsx|mjs)$/, '.ts');
  return path.relative(sourceRoot, target).split(path.sep).join('/');
}

function isAllowedRuntimeSdkFile(relative) {
  return runtimeSdkFiles.has(relative) || runtimeSdkRoots.some((prefix) => relative.startsWith(prefix));
}

function record(rule, file, message) {
  failures.push(`${rule} ${sourcePath(file)}: ${message}`);
}

function moduleSpecifiers(node) {
  if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
    return [node.moduleSpecifier.text];
  }
  if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
    return [node.arguments[0].text];
  }
  return [];
}

walk(sourceRoot);

for (const file of files) {
  const relative = sourcePath(file);
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const pureRoot = relative.startsWith('domain/') || relative.startsWith('content/');
  const persistence = relative.startsWith('persistence/');

  function visit(node) {
    for (const specifier of moduleSpecifiers(node)) {
      const isCore = specifier === '@iwsdk/core' || specifier.startsWith('@iwsdk/core/');
      const isThree = specifier === 'three' || specifier.startsWith('three/');
      if ((pureRoot || persistence) && !specifier.startsWith('.')) {
        record('INS-01', file, `pure ${persistence ? 'persistence' : 'domain/content'} code cannot import external module "${specifier}".`);
      }
      if (isThree) record('INS-03', file, `direct Three.js import "${specifier}" is forbidden; use the IWSDK boundary.`);

      if ((pureRoot || persistence) && isCore) {
        record('INS-01', file, `pure ${persistence ? 'persistence' : 'domain/content'} code cannot import "${specifier}".`);
      } else if (isCore && !isAllowedRuntimeSdkFile(relative)) {
        record('INS-01', file, `IWSDK imports belong in app, systems, world, component manifests, or the entry point.`);
      }

      if ((pureRoot || persistence) && specifier.startsWith('.')) {
        const local = resolvedLocalPath(file, specifier);
        const allowed = local.startsWith('domain/') || local.startsWith('content/');
        if (!allowed) record('INS-01', file, `pure ${persistence ? 'persistence' : 'domain/content'} code cannot depend on src/${local}.`);
      }
    }

    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      const name = ts.isIdentifier(expression) ? expression.text : ts.isPropertyAccessExpression(expression) ? expression.name.text : undefined;
      if (name && bannedLoopCalls.has(name)) record('INS-02', file, `"${name}()" must not drive the simulation; IWSDK owns the render loop.`);
    }
    if ((pureRoot || persistence) && ts.isIdentifier(node) && browserGlobals.has(node.text)) {
      record('INS-01', file, `pure ${persistence ? 'persistence' : 'domain/content'} code cannot use browser global "${node.text}".`);
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
}

if (failures.length) {
  console.error(`Rule checks failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`PASS INS-01: dependency boundaries (${files.length} TypeScript source files scanned)`);
  console.log('PASS INS-02: no application-managed render-loop or timer calls');
  console.log('PASS INS-03: no direct Three.js imports');
}
