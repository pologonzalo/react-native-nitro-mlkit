#!/usr/bin/env node
// Guards the invariants that make a package safe to publish.
//
// This exists because of two real incidents:
//
//   1. face-detection 0.1.0-beta.0 shipped without expo-module.config.json in
//      its `files` array. It installed cleanly from npm and then did nothing on
//      Android, because Expo's autolinking never found the module.
//   2. face-recognition reached the registry out-of-band, and its source then
//      sat uncommitted in a working tree for three days.
//
// So: every publishable package must carry the files consumers actually build
// against, and must declare its platforms honestly.
//
// Run: node scripts/check-release-hygiene.mjs

import fs from 'node:fs';
import path from 'node:path';

const REPO = 'https://github.com/pologonzalo/react-native-nitro-mlkit';

// Packages that are Android-only because Google ML Kit HAS NO iOS SDK for the
// API at all — not because iOS work is pending. They are complete for the only
// platform where the API exists, so they are publishable without a Swift
// implementation or a podspec. Anything NOT listed here is held to the
// cross-platform bar.
//
// Do not add a package here to silence the check. The question to answer is
// "does Google ship this API on iOS?" — if it does, the package needs Swift.
const ANDROID_ONLY_BY_MLKIT = {
  'document-scanner': 'ML Kit ships no Document Scanner API for iOS',
  'entity-extraction': 'ML Kit ships no Entity Extraction API for iOS',
  'face-mesh': 'ML Kit ships no Face Mesh Detection SDK for iOS',
  'smart-reply': 'ML Kit ships no Smart Reply API for iOS',
  'subject-segmentation': 'ML Kit ships no Subject Segmentation API for iOS',
};

// The committed nitrogen bindings are 0.36.x. A range that admits an older
// Nitro runtime lets a consumer install something that cannot compile them.
const MIN_NITRO_MINOR = 36;

/**
 * True if `range` permits react-native-nitro-modules older than 0.MIN_NITRO_MINOR.
 *
 * Parses the lower bound numerically rather than pattern-matching the string.
 * The previous version used /">=0\.(?:[0-9]|[12][0-9]|3[0-5])\./ which required
 * a trailing dot after the minor — so it never matched ">=0.20", the exact
 * range it existed to catch.
 */
function nitroRangeTooLoose(range) {
  const m = /(?:>=|\^|~)?\s*(\d+)\.(\d+)/.exec(range ?? '');
  if (!m) return true; // "*", "latest", unparseable → not safe
  const [, major, minor] = m.map(Number);
  return major > 0 ? false : minor < MIN_NITRO_MINOR;
}

const problems = [];
const rows = [];

for (const name of fs.readdirSync('packages').sort()) {
  const dir = path.join('packages', name);
  if (!fs.statSync(dir).isDirectory()) continue;

  const pkgPath = path.join(dir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const fail = (msg) => problems.push(`${pkg.name}: ${msg}`);

  const iosDir = path.join(dir, 'ios');
  const hasSwift =
    fs.existsSync(iosDir) && fs.readdirSync(iosDir).some((f) => f.endsWith('.swift'));
  const hasPodspec = fs.readdirSync(dir).some((f) => f.endsWith('.podspec'));
  const hasAndroid = fs.existsSync(path.join(dir, 'android'));
  const publishable = pkg.private !== true;
  const androidOnlyReason = ANDROID_ONLY_BY_MLKIT[name];

  if (!hasAndroid) fail('no android/ directory');

  // ── Platform honesty ────────────────────────────────────────────────────────
  const expoCfgPath = path.join(dir, 'expo-module.config.json');
  const expoCfg = fs.existsSync(expoCfgPath)
    ? JSON.parse(fs.readFileSync(expoCfgPath, 'utf8'))
    : null;
  const declaresIos = expoCfg?.platforms?.includes('ios') ?? false;

  if (androidOnlyReason) {
    // Android-only by ML Kit's design: must not claim iOS anywhere.
    if (declaresIos) {
      fail(`expo-module.config.json declares "ios" but ${androidOnlyReason}`);
    }
    if (hasSwift) {
      fail(
        `has ios/*.swift but is listed as Android-only (${androidOnlyReason}) — ` +
          'if Google shipped the API, remove it from ANDROID_ONLY_BY_MLKIT',
      );
    }
    const readme = path.join(dir, 'README.md');
    if (fs.existsSync(readme) && !/android[- ]only/i.test(fs.readFileSync(readme, 'utf8'))) {
      fail('README does not say the package is Android-only');
    }
  } else if (publishable) {
    // Cross-platform bar.
    if (!hasSwift) {
      fail(
        'publishable but has no ios/*.swift — implement iOS, or add it to ' +
          'ANDROID_ONLY_BY_MLKIT if Google ships no iOS SDK for the API',
      );
    }
    if (!hasPodspec) fail('publishable but has no *.podspec — CocoaPods cannot install it');
    if (hasSwift && !declaresIos) {
      fail('has ios/*.swift but expo-module.config.json does not list "ios"');
    }
  }

  // ── Metadata npm and humans rely on ────────────────────────────────────────
  if (!pkg.description) fail('missing "description"');
  if (!pkg.license) fail('missing "license"');
  if (!pkg.keywords?.length) fail('missing "keywords"');
  if (pkg.repository?.directory !== dir) fail(`repository.directory should be "${dir}"`);
  if (pkg.homepage !== `${REPO}/tree/main/packages/${name}#readme`) fail('wrong "homepage"');
  if (!pkg.bugs?.url) fail('missing "bugs.url"');

  // ── Files that must ship inside the tarball ────────────────────────────────
  for (const f of ['README.md', 'LICENSE']) {
    if (!fs.existsSync(path.join(dir, f))) fail(`missing ${f}`);
    if (!pkg.files?.includes(f)) fail(`"files" does not include ${f}`);
  }

  // Expo's autolinking discovers the native module by finding this file inside
  // node_modules; the module's constructor is what loads the .so and registers
  // the HybridObject with Nitro. Leave it out of the tarball and the package
  // installs fine and then silently does nothing. This shipped broken in
  // face-detection 0.1.0-beta.0 — hence the check.
  if (expoCfg && !pkg.files?.includes('expo-module.config.json')) {
    fail('"files" does not include expo-module.config.json — autolinking will not find the module');
  }

  // The generated Nitro bindings are what consumers actually build against.
  if (!fs.existsSync(path.join(dir, 'nitrogen', 'generated'))) {
    fail('no nitrogen/generated — run `npx nitrogen` in the package dir and commit it');
  }
  if (!pkg.files?.includes('nitrogen/generated')) {
    fail('"files" does not include nitrogen/generated');
  }

  // A config plugin is only reachable if app.plugin.js and plugin/ both ship.
  if (fs.existsSync(path.join(dir, 'app.plugin.js'))) {
    for (const entry of ['app.plugin.js', 'plugin']) {
      if (!pkg.files?.includes(entry)) {
        fail(`has a config plugin but "files" does not include ${entry}`);
      }
    }
  }

  // ── Version coupling ───────────────────────────────────────────────────────
  const nitro = pkg.peerDependencies?.['react-native-nitro-modules'];
  if (!nitro) fail('missing the react-native-nitro-modules peer dependency');
  else if (nitroRangeTooLoose(nitro)) {
    fail(
      `react-native-nitro-modules peer range "${nitro}" admits a runtime older ` +
        `than 0.${MIN_NITRO_MINOR}, which cannot compile the committed bindings`,
    );
  }

  if (pkg.scripts?.codegen && pkg.scripts.codegen !== 'nitrogen') {
    fail(`codegen script is "${pkg.scripts.codegen}" — the binary is "nitrogen"`);
  }
  if (!pkg.scripts?.lint) fail('missing a "lint" script — `pnpm -r lint` would skip it');

  const platform = androidOnlyReason ? 'android-only' : `ios:${hasSwift ? 'yes' : 'no '}`;
  rows.push(
    `${publishable ? '📦' : '🔒'} ${pkg.name.padEnd(34)} ${pkg.version.padEnd(14)} ${platform}`,
  );
}

console.log(rows.join('\n'));
console.log(`\n📦 publishable  🔒 held back (private: true)\n`);

if (problems.length) {
  console.error(`✖ ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('✔ release hygiene OK');
