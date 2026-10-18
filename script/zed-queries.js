// Writes zed/languages/silk/highlights.scm from queries/highlights.scm.
//
// Zed's themes know a smaller set of capture names than Neovim and Helix, so the shared queries
// are renamed here instead of being maintained twice. `--check` fails if the Zed copy is stale.
//
//   node script/zed-queries.js [--check]

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'queries', 'highlights.scm');
const TARGET = path.join(ROOT, 'zed', 'languages', 'silk', 'highlights.scm');

// Shared capture name -> Zed capture name. Names not listed are already Zed names.
const RENAMES = Object.assign(Object.create(null), {
  'character': 'string',
  'comment.documentation': 'comment.doc',
  'function.builtin': 'function',
  'function.call': 'function',
  'function.method.call': 'function',
  'keyword.conditional': 'keyword',
  'keyword.coroutine': 'keyword',
  'keyword.function': 'keyword',
  'keyword.import': 'keyword',
  'keyword.modifier': 'keyword',
  'keyword.repeat': 'keyword',
  'keyword.return': 'keyword',
  'module': 'type',
  'number.float': 'number',
  'type.parameter': 'type',
  'variable.builtin': 'variable.special',
});

const header = '; Generated from queries/highlights.scm by script/zed-queries.js. Do not edit.\n\n';
const source = fs.readFileSync(SOURCE, 'utf8');
// Predicate arguments such as `(#match? @constant ...)` are renamed with their capture.
const output = header + source.replace(/@([a-z][a-z.]*)/g, (whole, name) =>
  name in RENAMES ? `@${RENAMES[name]}` : whole);

if (process.argv.includes('--check')) {
  const current = fs.existsSync(TARGET) ? fs.readFileSync(TARGET, 'utf8') : '';
  if (current !== output) {
    console.error('zed/languages/silk/highlights.scm is stale; run `node script/zed-queries.js`');
    process.exit(1);
  }
  console.log('zed/languages/silk/highlights.scm is up to date');
} else {
  fs.writeFileSync(TARGET, output);
  console.log('Wrote zed/languages/silk/highlights.scm');
}
