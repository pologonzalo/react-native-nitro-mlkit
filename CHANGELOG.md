# Changelog

Packages are versioned independently. This file records notable changes across
the suite; per-package detail lives in each package's README.

Everything is still on the `beta` dist-tag — install with `@beta`.

## 2026-08-19 — the whole suite is on npm

### `@nitro-mlkit/face-recognition` `0.1.0-beta.1`

**iOS is implemented.** `face-recognition` was Android-only; it now ships a
Swift implementation mirroring the Kotlin contract — ML Kit FAST detection →
crop → TensorFlow Lite embedding, an in-memory registry with running-mean
references, and a chunked task-group batch.

Three non-obvious pieces, all documented in
`ios/HybridFaceRecognizer.swift`:

- **`TensorFlowLiteSwift`, not `TensorFlowLiteObjC`** — the ObjC pod ships no
  module map, so `import` fails and `pod install` breaks. That is exactly why
  `0.1.0-beta.0` shipped Android-only.
- **Every image is redrawn upright before cropping** — ML Kit reports face
  frames in oriented space while `CGImage.cropping` works in raw-pixel space.
  Without normalizing, a portrait iPhone photo crops an ear instead of a face.
- **The TFLite `Interpreter` is serialized behind a lock** — it is not
  thread-safe. Detection still overlaps.

Added, on **both** platforms:

- `FindPeopleOptions.targetSize` (default `1024`) — the longest-side target each
  photo is decoded at. On iOS this is what makes `ph://` scanning cheap:
  PhotoKit serves a locally-cached rendition at that size instead of the
  full-resolution original. On Android it drives a bounds-decode plus
  `inSampleSize`, so 12 MP × 700 photos no longer materialize in memory.
- `FindPeopleOptions.allowNetworkAccess` (default **`false`**) — iOS + `ph://`
  only. Photos whose pixels live only in iCloud come back as
  `success: false, error: "icloud"` so you can count them and offer the user a
  deliberate, network-allowed second pass instead of silently consuming their
  data plan.
- `findPeopleInPhotos` accepts `ph://` URIs directly on iOS.

Also: podspec restored, `nitro.json` / `expo-module.config.json` back to
`ios + android`, nitrogen bindings regenerated, and a config plugin added.

> ⚠️ The plugin **shares its Podfile marker with `face-detection`'s plugin on
> purpose.** CocoaPods allows only one top-level `post_integrate` per Podfile, so
> whichever plugin runs first writes the block and the other widens it in place.
> Both orders work — do not "clean up" the shared marker.

**Still pending:** on-device validation on a physical iPhone. Google ML Kit and
`TensorFlowLiteC` ship no `arm64` Simulator slice, so every recognition method
throws a clear error on the Simulator by design.

### `@nitro-mlkit/face-detection` `0.1.0-beta.3`

- `headEulerAngleX` (pitch) is now exposed on `DetectedFace`, alongside the
  existing yaw and roll.
- **The published tarball no longer breaks on Android.**
  `expo-module.config.json` was missing from the package's `files` array, so it
  never reached npm. Expo's autolinking discovers the Android module by locating
  that file inside `node_modules`, and the module's constructor is what loads the
  native library and registers the `FaceDetector` HybridObject with Nitro.
  Without it, `0.1.0-beta.0` installed cleanly and then did nothing —
  `NitroFace.isAvailable()` returned `false`. The bug was invisible in
  development because the example app consumes the package through a pnpm
  workspace link, which exposes the whole directory and never consults `files`.
  Only a real `npm pack` reveals it — hence the new CI job.
- MLKit is stubbed behind `#if targetEnvironment(simulator)` and the config
  plugin strips its frameworks from the Simulator link, so an `arm64` Simulator
  build compiles instead of failing to link.
- Nitrogen bindings regenerated with 0.36.5.

### Five Android-only packages published for the first time

`document-scanner`, `entity-extraction`, `face-mesh`, `smart-reply` and
`subject-segmentation` are now on npm at `0.1.0-beta.0`.

These are Android-only because **Google ML Kit has no iOS SDK for those APIs at
all** — not because iOS work is missing. They are complete for the only platform
where the API exists. Their JS entry points throw a clear, named error off
Android rather than failing silently, and each README documents the constraint.

## Tooling — 2026-08-19

### Added

- `scripts/publish.mjs` — publishes every package whose version is not yet on
  npm, deriving the list from `package.json` rather than a hand-maintained one.
  Dry-run by default; refuses to run if the hygiene check fails. An out-of-band
  publish is how `face-recognition` first reached the registry, and how its
  source then sat uncommitted for three days.
- `scripts/check-release-hygiene.mjs` — asserts the invariants that make a
  package safe to publish: committed nitrogen bindings, a shipped
  `expo-module.config.json`, a Nitro peer range tight enough for the committed
  bindings, and the npm metadata. It would have caught the face-detection
  packaging bug.
- `scripts/fix-npm-tags.mjs` — audits and repairs dist-tags.
- CI (`.github/workflows/ci.yml`) — typechecks all 16 packages, runs the hygiene
  check, and `npm pack --dry-run`s every package so a broken tarball fails in CI
  instead of on a user's machine.
- `CONTRIBUTING.md`, and a root README with the real per-platform verification
  status of all 16 packages plus the benchmark results.

### Changed

- The `react-native-nitro-modules` peer range is now `>=0.36.0 <1.0.0` across the
  suite. It was `>=0.20`, which let you install a Nitro runtime too old to
  compile the committed nitrogen 0.36.x bindings.
- `codegen` scripts now invoke `nitrogen`; two packages pointed at
  `nitro-codegen`, a binary that does not exist in this toolchain.
- Every package has a `lint` script, so `pnpm -r lint` typechecks the whole
  suite instead of a single package.
- `scripts/publish-beta.sh` removed, superseded by `publish.mjs`.

## Earlier

The suite's first betas (10 packages) were published on 2026-07-18. See
[`HANDOFF.md`](./HANDOFF.md) for the full session-by-session history.
