#!/usr/bin/env node
// Guards the invariants that make a package safe to publish.
//
// This exists because @nitro-mlkit/face-recognition reached npm without an iOS
// implementation, outside the deliberate release list. The rule the repo follows:
// a package is publishable (`private: false`) only when it works on BOTH
// platforms. Android-only packages stay `private: true` until iOS lands.
//
// Run: node scripts/check-release-hygiene.mjs

import fs from 'node:fs';
import path from 'node:path';

const REPO = 'https://github.com/pologonzalo/react-native-nitro-mlkit';
const problems = [];
const rows = [];

for (const name of fs.readdirSync('packages').sort()) {
  const dir = path.join('packages', name);
  if (!fs.statSync(dir).isDirectory()) continue;

  const pkgPath = path.join(dir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const fail = (msg) => problems.push(`${pkg.name}: ${msg}`);

  const hasSwift =
    fs.existsSync(path.join(dir, 'ios')) &&
    fs.readdirSync(path.join(dir, 'ios')).some((f) => f.endsWith('.swift'));
  const hasPodspec = fs.readdirSync(dir).some((f) => f.endsWith('.podspec'));
  const hasAndroid = fs.existsSync(path.join(dir, 'android'));
  const publishable = pkg.private !== true;

  // The core rule.
  if (publishable && !hasSwift) {
    fail('publishable but has no ios/*.swift — set "private": true until iOS lands');
  }
  if (publishable && !hasPodspec) {
    fail('publishable but has no *.podspec — CocoaPods cannot install it');
  }
  if (!hasAndroid) fail('no android/ directory');

  // Metadata npm and humans rely on.
  if (typeof pkg.private !== 'boolean') fail('missing an explicit "private" boolean');
  if (!pkg.description) fail('missing "description"');
  if (!pkg.license) fail('missing "license"');
  if (!pkg.keywords?.length) fail('missing "keywords"');
  if (pkg.repository?.directory !== dir) fail(`repository.directory should be "${dir}"`);
  if (pkg.homepage !== `${REPO}/tree/main/packages/${name}#readme`) fail('wrong "homepage"');
  if (!pkg.bugs?.url) fail('missing "bugs.url"');

  // Files that must ship inside the tarball.
  for (const f of ['README.md', 'LICENSE']) {
    if (!fs.existsSync(path.join(dir, f))) fail(`missing ${f}`);
    if (!pkg.files?.includes(f)) fail(`"files" does not include ${f}`);
  }

  // Expo's autolinking discovers the Android module by finding this file inside
  // node_modules; the module's constructor is what loads the .so and registers
  // the HybridObject with Nitro. Leave it out of the tarball and the package
  // installs fine and then silently does nothing on Android. This shipped broken
  // in face-detection 0.1.0-beta.0/1 — hence the check.
  if (fs.existsSync(path.join(dir, 'expo-module.config.json')) &&
      !pkg.files?.includes('expo-module.config.json')) {
    fail('"files" does not include expo-module.config.json — Android autolinking will not find the module');
  }

  // The generated Nitro bindings are what consumers actually build against.
  if (!fs.existsSync(path.join(dir, 'nitrogen', 'generated'))) {
    fail('no nitrogen/generated — run `npx nitrogen` in the package dir and commit it');
  }
  if (!pkg.files?.includes('nitrogen/generated')) {
    fail('"files" does not include nitrogen/generated');
  }

  // Generated bindings are version-coupled to the Nitro runtime; a loose range
  // lets a consumer install a nitro that cannot compile them.
  const nitro = pkg.peerDependencies?.['react-native-nitro-modules'];
  if (!nitro) fail('missing the react-native-nitro-modules peer dependency');
  else if (/>=0\.(?:[0-9]|[12][0-9]|3[0-5])\./.test(nitro)) {
    fail(`react-native-nitro-modules peer range "${nitro}" is too loose for nitrogen 0.36 bindings`);
  }

  if (pkg.scripts?.codegen && pkg.scripts.codegen !== 'nitrogen') {
    fail(`codegen script is "${pkg.scripts.codegen}" — the binary is "nitrogen"`);
  }

  rows.push(
    `${publishable ? '📦' : '🔒'} ${pkg.name.padEnd(34)} ${pkg.version.padEnd(14)} ` +
      `ios:${hasSwift ? 'yes' : 'no '} android:${hasAndroid ? 'yes' : 'no '}`,
  );
}

console.log(rows.join('\n'));
console.log(`\n📦 publishable  🔒 held back (Android-only)\n`);

if (problems.length) {
  console.error(`✖ ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('✔ release hygiene OK');
