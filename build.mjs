// Zero dependency build: inlines the ES modules in src, in dependency order,
// into one self contained site/index.html. Fails on forbidden canvas usage.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'site');
const ENTRY = 'main.js';

const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*['"](\.\/[^'"]+)['"];?[ \t]*$/gm;
const EXPORT_RE = /^export\s+(?:async\s+)?(const|let|function\*?|class)\s+([A-Za-z_$][\w$]*)/gm;

// Rules that fail the build. Per frame glow must come from cached sprites.
const FORBIDDEN = [
  [/\bshadowBlur\b/, 'shadowBlur'],
  [/\bshadowColor\b/, 'shadowColor'],
  [/\.filter\s*=(?!=)/, 'canvas filter assignment'],
  [/\[\s*['"]filter['"]\s*\]\s*=(?!=)/, 'canvas filter assignment'],
  [/\bfetch\s*\(/, 'network request'],
  [/\bXMLHttpRequest\b/, 'network request'],
  [/\bimport\s*\(/, 'dynamic import'],
  [/\bWebSocket\b/, 'network request'],
  [/\bsendBeacon\b/, 'network request'],
];

function lint(name, code) {
  const errors = [];
  code.split('\n').forEach((line, i) => {
    for (const [re, what] of FORBIDDEN) if (re.test(line)) errors.push(`${name}:${i + 1} ${what}: ${line.trim()}`);
  });
  return errors;
}

function collect() {
  const order = [];
  const state = new Map();
  const visit = (name, from) => {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'active') throw new Error(`import cycle at ${name} (from ${from})`);
    state.set(name, 'active');
    const code = readFileSync(join(SRC, name), 'utf8');
    for (const m of code.matchAll(IMPORT_RE)) visit(normalize(join(dirname(name), m[2])).replace(/\\/g, '/'), name);
    state.set(name, 'done');
    order.push({ name, code });
  };
  visit(ENTRY, 'entry');
  return order;
}

function transform({ name, code }) {
  const exported = [];
  let out = code.replace(IMPORT_RE, (_, names, from) => {
    const key = normalize(join(dirname(name), from)).replace(/\\/g, '/');
    const binds = names.split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.replace(/\s+as\s+/, ': '));
    return `const { ${binds.join(', ')} } = __m[${JSON.stringify(key)}];`;
  });
  out = out.replace(EXPORT_RE, (m, kind, id) => {
    if (kind === 'let') throw new Error(`${name}: export let breaks live bindings, export an object instead (${id})`);
    exported.push(id);
    return m.replace(/^export\s+/, '');
  });
  if (/^\s*export\s/m.test(out)) throw new Error(`${name}: unsupported export form`);
  if (/^\s*import\s/m.test(out)) throw new Error(`${name}: unsupported import form`);
  return `__m[${JSON.stringify(name)}] = (() => {\n${out}\nreturn { ${exported.join(', ')} };\n})();`;
}

function build({ quiet = false } = {}) {
  const modules = collect();
  const errors = modules.flatMap((m) => lint(m.name, m.code));
  const css = readFileSync(join(SRC, 'style.css'), 'utf8');
  if (/\bfilter\s*:/.test(css)) errors.push('style.css: css filter');
  if (errors.length) throw new Error('forbidden usage:\n' + errors.join('\n'));
  for (const m of modules) {
    const lines = m.code.split('\n').length;
    if (lines > 420 && !quiet) console.warn(`warning: ${m.name} has ${lines} lines`);
  }
  const js = `(() => {\n'use strict';\nconst __m = {};\n${modules.map(transform).join('\n')}\n})();`;
  const html = readFileSync(join(SRC, 'index.html'), 'utf8');
  const page = html.replace('/*__STYLE__*/', () => css.trim()).replace('/*__SCRIPT__*/', () => js);
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'index.html'), page);
  if (!quiet) console.log(`built site/index.html: ${modules.length} modules, ${(page.length / 1024).toFixed(1)} KB`);
  return { modules: modules.map((m) => m.name), bytes: page.length };
}

try { build({ quiet: process.argv.includes('--quiet') }); } catch (e) { console.error(e.message); process.exit(1); }
