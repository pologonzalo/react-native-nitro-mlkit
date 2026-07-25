# Changelog

Packages are versioned independently. This file records notable changes across
the suite; per-package detail lives in each package's README.

## `@nitro-mlkit/face-detection` 0.1.0 — 2026-07-25

First stable release. Detection is verified on-device on **both** Android
(Pixel 9, API 36) and a physical iPhone.

### Fixed

- **The published tarball was broken on Android.** `expo-module.config.json` was
  missing from the package's `files` array, so it never shipped to npm. Expo's
  autolinking finds the Android module by locating that file inside
  `node_modules`, and the module's constructor is what loads the native library
  and registers the `FaceDetector` HybridObject with Nitro. Without it,
  `0.1.0-beta.0` and `0.1.0-beta.1` installed cleanly and then did nothing on
  Android — `NitroFace.isAvailable()` returned `false`. Both betas are now
  deprecated on npm; **0.1.0 is the first build that works when installed from the
  registry.** The bug was invisible in development because the example app
  consumes the package through a pnpm workspace link, which exposes the whole
  directory.

### Changed

- `detectBatch(uris, concurrency, options?)` takes an optional third argument, so
  a whole batch can be classified — real `smilingProbability` and
  `*EyeOpenProbability` per face. `detect()` and `detectBatch()` now build and
  **cache** a detector matching the requested options, which also fixes `detect()`
  having silently ignored `classifications`, `tracking` and `minFaceSize`.
- The `react-native-nitro-modules` peer range is now `>=0.36.0 <1.0.0`. It was
  `>=0.20`, which let you install a Nitro runtime too old to compile the
  committed nitrogen 0.36.x bindings.
- `codegen` script now invokes `nitrogen`; it pointed at `nitro-codegen`, a
  binary that does not exist in this toolchain.

### Not included

Face recognition / embeddings (`extractEmbedding`, `detectAndEmbed`,
`extractPrimaryEmbedding`) remain stubs that throw. They land in `v0.2.0` with
MobileFaceNet. `compareFaces` already ships the cosine-similarity math.

## The suite — 2026-07-25

### Changed

- Nine cross-platform packages moved to `0.1.0-beta.1`, picking up the corrected
  Nitro peer range and npm metadata (`homepage`, `bugs`, normalized
  `repository`): `barcode-scanning`, `digital-ink`, `image-labeling`,
  `language-id`, `object-detection`, `pose-detection`, `selfie-segmentation`,
  `text-recognition`, `translation`.
- **Six Android-only packages are now `private: true`** so they cannot reach npm
  before they have an iOS implementation: `document-scanner`,
  `entity-extraction`, `face-mesh`, `face-recognition`, `smart-reply`,
  `subject-segmentation`. Their READMEs now explain how to consume them from the
  monorepo instead of pointing at an npm package that does not exist.
- `@nitro-mlkit/face-recognition` is **deprecated on npm**. It was published
  outside the deliberate release list and has no iOS implementation. The Android
  TFLite embedding path is real and works, but you must supply your own model.

### Added

- CI (`.github/workflows/ci.yml`) — typechecks all 16 packages, runs the release
  hygiene check, and `npm pack --dry-run`s every publishable package so a broken
  tarball fails in CI instead of on a user's machine.
- `scripts/check-release-hygiene.mjs` — asserts that a publishable package has an
  iOS implementation, a podspec, committed nitrogen bindings, a shipped
  `expo-module.config.json`, and the npm metadata. This would have caught both
  the face-detection packaging bug and the accidental face-recognition publish.
- `scripts/publish.mjs` and `scripts/fix-npm-tags.mjs`, replacing the
  hand-maintained `publish-beta.sh`. Both are dry-run by default.
- `CONTRIBUTING.md`, and a root README that lists all 16 packages with their real
  per-platform verification status and surfaces the benchmark results.

## Earlier

The suite's first betas (10 packages) were published on 2026-07-18. See
[`HANDOFF.md`](./HANDOFF.md) for the full session-by-session history.
