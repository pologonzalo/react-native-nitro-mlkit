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

/**
 * Version-level deprecations, per package.
 *
 * Keep these keyed to SPECIFIC versions, never to a whole package name. An
 * earlier draft deprecated every version of face-recognition for "no iOS
 * implementation"; 0.1.0-beta.1 shipped one, so that would now be a false
 * warning on every install.
 */
const DEPRECATE_VERSIONS = {
  'face-detection': {
    // These shipped without expo-module.config.json in `files`, so Expo's
    // autolinking never finds the module and the HybridObject never registers.
    // Verified against the real tarballs: beta.2's `files` array lacks it too —
    // 0.1.0-beta.3 is the first build that works when installed from npm.
    versions: ['0.1.0-beta.0', '0.1.0-beta.1', '0.1.0-beta.2'],
    message:
      'Broken on Android: the published tarball omitted expo-module.config.json, ' +
      'so Expo autolinking never registers the native module. Upgrade with ' +
      '`npm i @nitro-mlkit/face-detection@beta` (0.1.0-beta.3 or newer).',
  },
  'face-recognition': {
    // beta.0 works on Android but has no iOS implementation at all, and its
    // podspec pulled TensorFlowLiteObjC, which has no module map — `pod install`
    // failed outright. beta.1 added the Swift implementation.
    versions: ['0.1.0-beta.0'],
    message:
      'Android-only, and `pod install` fails on iOS. Upgrade with ' +
      '`npm i @nitro-mlkit/face-recognition@beta` (0.1.0-beta.1 adds the iOS ' +
      'implementation). You still supply your own TFLite embedding model.',
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
  //
  // A MISSING beta tag counts as wrong, not as "nothing to do": every README in
  // the suite tells people to install with `@beta`, so a prerelease-only package
  // without the tag makes `npm i <pkg>@beta` fail outright. Publishing without
  // `--tag beta` is how document-scanner ended up in that state.
  const wantBeta = cmp(newest, wantLatest) > 0 ? newest : wantLatest;
  const needsBeta = isPre(wantBeta) || tags.beta;
  if (needsBeta && tags.beta !== wantBeta) {
    plan.push({
      why: `${pkg.name}: beta → ${wantBeta} (was ${tags.beta ?? 'unset'})`,
      cmd: ['dist-tag', 'add', `${pkg.name}@${wantBeta}`, 'beta'],
    });
  }

  // Version-level deprecations for builds we know are broken.
  const stale = DEPRECATE_VERSIONS[name];
  if (stale) {
    for (const v of stale.versions.filter((x) => published.includes(x))) {
      if (meta.versions[v].deprecated) continue;
      // Never deprecate the version the repo is currently shipping.
      if (v === pkg.version) continue;
      plan.push({
        why: `${pkg.name}@${v}: deprecate`,
        cmd: ['deprecate', `${pkg.name}@${v}`, stale.message],
      });
    }
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
