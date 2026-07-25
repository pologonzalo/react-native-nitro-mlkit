#!/usr/bin/env node
/**
 * Audits @nitro-mlkit/* dist-tags on npm against this repo, and repairs them.
 *
 * Prints a plan by default and changes nothing. Pass --apply to execute it
 * (requires `npm login`).
 *
 *   node scripts/fix-npm-tags.mjs            # dry run — just show the plan
 *   node scripts/fix-npm-tags.mjs --apply    # actually run the npm commands
 *
 * Why this exists: npm sets `latest` on a package's FIRST publish even when you
 * pass `--tag beta`. The suite's first release therefore left `latest` pointing
 * at prereleases, and on face-detection it pointed at an OLDER beta than the
 * `beta` tag did — so a plain `npm install` fetched a stale, broken build.
 */

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const APPLY = process.argv.includes('--apply');

/** Versions of face-detection that shipped without expo-module.config.json and
 *  therefore never register the HybridObject on Android. */
const BROKEN = {
  'face-detection': {
    versions: ['0.1.0-beta.0', '0.1.0-beta.1'],
    message:
      'Broken on Android: the published tarball omitted expo-module.config.json, ' +
      'so Expo autolinking never registers the native module. Upgrade to 0.1.0.',
  },
};

/** Published but has no iOS implementation; it escaped the release list. */
const DEPRECATE_PACKAGE = {
  'face-recognition': {
    message:
      'Android-only — there is no iOS implementation yet (planned for v0.2.0), and ' +
      'you must supply your own TFLite embedding model. Use @nitro-mlkit/face-detection ' +
      'for cross-platform face work.',
  },
};

const isPre = (v) => v.includes('-');

/** Compares 0.1.0 > 0.1.0-beta.10 > 0.1.0-beta.2 correctly for our tag scheme. */
function cmp(a, b) {
  const split = (v) => {
    const [core, pre = ''] = v.split('-');
    return [
      ...core.split('.').map(Number),
      pre ? 0 : 1, // a release outranks any prerelease of the same core
      ...(pre.match(/\d+/g) ?? []).map(Number),
    ];
  };
  const [x, y] = [split(a), split(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? -1) - (y[i] ?? -1);
    if (d) return d;
  }
  return 0;
}

const plan = [];
const notes = [];

for (const name of fs.readdirSync('packages').sort()) {
  const pkg = JSON.parse(fs.readFileSync(`packages/${name}/package.json`, 'utf8'));

  let meta;
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg.name)}`);
    if (res.status === 404) {
      notes.push(
        `${pkg.name} — not on npm` +
          (pkg.private ? ' (held back, as intended)' : ' ⚠️ publishable but unpublished'),
      );
      continue;
    }
    meta = await res.json();
  } catch (err) {
    notes.push(`${pkg.name} — registry lookup failed: ${err.message}`);
    continue;
  }

  const published = Object.keys(meta.versions);
  const tags = meta['dist-tags'] ?? {};
  const newest = published.reduce((a, b) => (cmp(a, b) > 0 ? a : b));
  const newestStable = published.filter((v) => !isPre(v)).sort(cmp).at(-1);

  // `latest` must never point at something older than the newest release.
  const wantLatest = newestStable ?? newest;
  if (tags.latest !== wantLatest) {
    plan.push({
      why: `${pkg.name}: latest → ${wantLatest} (was ${tags.latest ?? 'unset'})`,
      cmd: ['dist-tag', 'add', `${pkg.name}@${wantLatest}`, 'latest'],
    });
  }

  // `beta` should never resolve to something worse than `latest`.
  const wantBeta = cmp(newest, wantLatest) > 0 ? newest : wantLatest;
  if (tags.beta && tags.beta !== wantBeta) {
    plan.push({
      why: `${pkg.name}: beta → ${wantBeta} (was ${tags.beta})`,
      cmd: ['dist-tag', 'add', `${pkg.name}@${wantBeta}`, 'beta'],
    });
  }

  // Version-level deprecations for builds we know are broken.
  const broken = BROKEN[name];
  if (broken) {
    for (const v of broken.versions.filter((x) => published.includes(x))) {
      if (meta.versions[v].deprecated) continue;
      plan.push({
        why: `${pkg.name}@${v}: deprecate (broken on Android)`,
        cmd: ['deprecate', `${pkg.name}@${v}`, broken.message],
      });
    }
  }

  // Whole-package deprecation.
  const dep = DEPRECATE_PACKAGE[name];
  if (dep && !published.every((v) => meta.versions[v].deprecated)) {
    plan.push({
      why: `${pkg.name}: deprecate every version (no iOS implementation)`,
      cmd: ['deprecate', pkg.name, dep.message],
    });
  }

  if (!pkg.private && !published.includes(pkg.version)) {
    notes.push(
      `${pkg.name} — repo is at ${pkg.version}, not yet on npm (publish it first, then re-run this)`,
    );
  }
}

if (notes.length) {
  console.log('Notes:');
  for (const n of notes) console.log(`  · ${n}`);
  console.log('');
}

if (!plan.length) {
  console.log('✔ dist-tags already correct — nothing to do.');
  process.exit(0);
}

console.log(`${plan.length} change(s) needed:\n`);
for (const { why, cmd } of plan) {
  console.log(`  ${why}`);
  console.log(`    npm ${cmd.map((a) => (a.includes(' ') ? JSON.stringify(a) : a)).join(' ')}\n`);
}

if (!APPLY) {
  console.log('Dry run — nothing changed. Re-run with --apply to execute (needs `npm login`).');
  process.exit(0);
}

console.log('Applying…\n');
for (const { why, cmd } of plan) {
  process.stdout.write(`  ${why} … `);
  try {
    execFileSync('npm', cmd, { stdio: ['ignore', 'ignore', 'pipe'] });
    console.log('ok');
  } catch (err) {
    console.log('FAILED');
    console.error(String(err.stderr ?? err.message).trim());
    process.exitCode = 1;
  }
}
