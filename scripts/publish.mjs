#!/usr/bin/env node
/**
 * Publishes every publishable @nitro-mlkit/* package whose version is not on npm
 * yet. Derives everything from package.json — there is no hand-maintained list to
 * fall out of sync (an out-of-band publish is how face-recognition reached the
 * registry in the first place).
 *
 *   node scripts/publish.mjs            # dry run — show what would be published
 *   node scripts/publish.mjs --apply    # actually publish (needs `npm login`)
 *
 * Rules:
 *   · `private: true`  → never published (Android-only packages)
 *   · version with `-` → published under the `beta` tag
 *   · plain version    → published under `latest`
 *
 * Release hygiene is checked first; a failure aborts before anything is pushed.
 * Already-published versions are skipped, so re-running is safe.
 */

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const APPLY = process.argv.includes('--apply');

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: 'utf8', ...opts });

// 1. Never publish from a repo that fails its own invariants.
try {
  run('node', ['scripts/check-release-hygiene.mjs'], { stdio: ['ignore', 'pipe', 'pipe'] });
  console.log('✔ release hygiene OK\n');
} catch (err) {
  console.error('✖ release hygiene failed — fix this before publishing:\n');
  console.error(String(err.stdout ?? '') + String(err.stderr ?? ''));
  process.exit(1);
}

// 2. Work out what is missing from the registry.
const todo = [];
const skipped = [];

for (const name of fs.readdirSync('packages').sort()) {
  const pkg = JSON.parse(fs.readFileSync(`packages/${name}/package.json`, 'utf8'));
  if (pkg.private) {
    skipped.push(`🔒 ${pkg.name} — held back (Android-only)`);
    continue;
  }

  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg.name)}`);
  const published = res.status === 404 ? [] : Object.keys((await res.json()).versions);

  if (published.includes(pkg.version)) {
    skipped.push(`✓  ${pkg.name}@${pkg.version} — already on npm`);
    continue;
  }

  todo.push({
    dir: `packages/${name}`,
    name: pkg.name,
    version: pkg.version,
    tag: pkg.version.includes('-') ? 'beta' : 'latest',
    isFirst: published.length === 0,
  });
}

if (skipped.length) {
  console.log('Skipping:');
  for (const s of skipped) console.log(`  ${s}`);
  console.log('');
}

if (!todo.length) {
  console.log('Nothing to publish — the registry matches this repo.');
  process.exit(0);
}

console.log(`Would publish ${todo.length} package(s):\n`);
for (const t of todo) {
  console.log(`  ${t.name}@${t.version}  --tag ${t.tag}${t.isFirst ? '  (first publish)' : ''}`);
}
console.log('');

const firstStable = todo.filter((t) => t.tag === 'latest' && t.isFirst);
if (firstStable.length) {
  console.log(
    '⚠️  Note: npm sets `latest` on a first publish regardless of --tag, so run\n' +
      '    `node scripts/fix-npm-tags.mjs` afterwards to confirm the tags landed right.\n',
  );
}

if (!APPLY) {
  console.log('Dry run — nothing published. Re-run with --apply to publish.');
  process.exit(0);
}

// 3. Publish.
try {
  console.log(`Authenticated as: ${run('npm', ['whoami']).trim()}\n`);
} catch {
  console.error('✖ Not logged in to npm. Run `npm login` first.');
  process.exit(1);
}

const done = [];
const failed = [];

for (const t of todo) {
  process.stdout.write(`  publishing ${t.name}@${t.version} (--tag ${t.tag}) … `);
  try {
    run('npm', ['publish', '--access', 'public', '--tag', t.tag], {
      cwd: t.dir,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    console.log('ok');
    done.push(`${t.name}@${t.version}`);
  } catch (err) {
    console.log('FAILED');
    console.error(`    ${String(err.stderr ?? err.message).trim().split('\n')[0]}`);
    failed.push(`${t.name}@${t.version}`);
  }
}

console.log(`\nPublished (${done.length}): ${done.join(', ') || 'none'}`);
if (failed.length) {
  console.log(`Failed    (${failed.length}): ${failed.join(', ')}`);
}
console.log('\nNext: node scripts/fix-npm-tags.mjs   (verify dist-tags)');
process.exitCode = failed.length ? 1 : 0;
