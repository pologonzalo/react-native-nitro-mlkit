# React Native ML Kit — the complete suite, on Nitro

The full **Google ML Kit** feature set for **React Native & Expo**, published as
[`@nitro-mlkit/*`](#packages) and built with
[Nitro Modules](https://github.com/mrousavy/nitro) — JSI, synchronous crossing,
no bridge, no JSON serialization.

All processing runs **on-device** — no data leaves the phone, no cloud APIs, no
Firebase required.

```bash
npm install @nitro-mlkit/face-detection react-native-nitro-modules
```

## Status

Read this before you pick a package — the suite is not uniformly mature.

- **`@nitro-mlkit/face-detection` is `0.1.0`** — verified on-device on **both**
  Android and a physical iPhone. This is the one to start with.
- **9 more packages are on the `beta` tag.** All are verified on Android. Their
  iOS code compiles, links and signs, but **on-device iOS runtime is only
  confirmed for `image-labeling`** — the other 8 are unvalidated on iOS hardware.
- **5 packages are Android-only and deliberately unpublished** — they have no iOS
  implementation yet. They work if you consume them from this repo.
- **`@nitro-mlkit/face-recognition` is on npm by accident.** It works on Android
  — a real TFLite embedding path where **you supply the model** — but it has no
  iOS implementation, and it was published outside the deliberate release list.
  Treat it as `v0.2.0` material.

Install betas explicitly with the tag:

```bash
npm install @nitro-mlkit/image-labeling@beta react-native-nitro-modules
```

## Packages

| Package | What it does | iOS | Android | npm |
| ------- | ------------ | --- | ------- | --- |
| [`face-detection`](./packages/face-detection) | Faces, landmarks, smiling/eyes-open classification, native batch, native cropping | ✅ verified on device | ✅ verified | **`0.1.0`** |
| [`image-labeling`](./packages/image-labeling) | Image classification (400+ labels), safety filter, batch | ✅ verified on device | ✅ verified | `beta` |
| [`barcode-scanning`](./packages/barcode-scanning) | Barcodes & QR codes, all formats | ⚠️ compiles, unvalidated | ✅ verified | `beta` |
| [`text-recognition`](./packages/text-recognition) | OCR — blocks, lines, elements | ⚠️ compiles, unvalidated | ✅ verified | `beta` |
| [`object-detection`](./packages/object-detection) | Object detection & tracking | ⚠️ compiles, unvalidated | ✅ verified | `beta` |
| [`pose-detection`](./packages/pose-detection) | 33-point body pose landmarks | ⚠️ compiles, unvalidated | ✅ verified | `beta` |
| [`selfie-segmentation`](./packages/selfie-segmentation) | Person/background mask | ⚠️ compiles, unvalidated | ✅ verified | `beta` |
| [`language-id`](./packages/language-id) | Language identification from text | ⚠️ compiles, unvalidated | ✅ verified | `beta` |
| [`translation`](./packages/translation) | On-device translation (runtime model download) | ⚠️ compiles, unvalidated | ✅ verified | `beta` |
| [`digital-ink`](./packages/digital-ink) | Handwriting recognition from strokes | ⚠️ compiles, unvalidated | ✅ verified | `beta` |
| [`face-mesh`](./packages/face-mesh) | 468-point dense face mesh | ❌ not implemented | ✅ verified | — |
| [`smart-reply`](./packages/smart-reply) | Suggested replies from a conversation | ❌ not implemented | ✅ verified | — |
| [`entity-extraction`](./packages/entity-extraction) | Phones, emails, addresses, dates from text | ❌ not implemented | ✅ verified | — |
| [`subject-segmentation`](./packages/subject-segmentation) | Foreground subject mask | ❌ not implemented | ✅ verified | — |
| [`document-scanner`](./packages/document-scanner) | Full-screen scanner flow → pages + PDF | ❌ not implemented | ✅ verified | — |
| [`face-recognition`](./packages/face-recognition) | "This is Marcos" — face embeddings & matching, bring your own TFLite model | ❌ not implemented | ✅ verified | ⚠️ see above |

"✅ verified" means the package was exercised live on real hardware — a Pixel 9
emulator for Android, the maintainer's iPhone for iOS — not merely compiled.

## Quick start

```ts
import { NitroFace, PerformanceMode } from "@nitro-mlkit/face-detection";

// One image
const faces = await NitroFace.detect(imageUri, {
  performanceMode: PerformanceMode.FAST,
  landmarks: false,
  classifications: false,
  minFaceSize: 0.1,
  tracking: false,
});

// A whole gallery — ONE JSI call, N images detected concurrently in native
const results = await NitroFace.detectBatch(galleryUris, 4 /* concurrency */);
```

This package ships native code, so it does **not** run in Expo Go — use a
development build or the bare workflow. For Expo, add the config plugin and
prebuild:

```json
{ "plugins": ["@nitro-mlkit/face-detection"] }
```

Per-package APIs are documented in each package's README.

## Benchmarks

Scanning **500 images** for faces, Android. Every library wraps the **same**
Google ML Kit `16.1.7` with the **same** options, so ML Kit inference is
identical — the only variable is how the call crosses into native.

| | `@nitro-mlkit` | `@react-native-ml-kit` (bridge) | `@infinitered` (Expo module) |
| --- | ---: | ---: | ---: |
| Single call (median of 40) | **2.98 ms** | 3.35 ms | 3.92 ms |
| Sequential ×500 | **1545 ms** | 1965 ms | 2917 ms |
| **Native batch ×500** | **681 ms** | ✖ no batch API | ✖ no batch API |
| vs best competitor | **2.89× faster** | — | — |

The per-call win (~1.3×) is the bridge overhead Nitro removes — real, but bounded
because ML Kit inference dominates each call. **The batch API is the actual
story**: one crossing plus native concurrency instead of 500 round-trips driven
from the JS thread, which also keeps the JS thread free during a scan.

> ⚠️ **These are emulator numbers** (Pixel 9, API 36) on 128×128 portraits, and
> emulators are noisy. Treat them as directional. The tiny images *understate*
> the batch win — real multi-megapixel photos spend far more time in
> parallelizable inference. **iOS benchmarks are still pending** (needs a
> physical device). Full methodology, the concurrency sweep, and every caveat:
> [`benchmark/README.md`](./benchmark/README.md).

## Why Nitro?

Traditional React Native bridge:

```
JS → serialize → bridge queue → deserialize → Native → serialize → bridge → JS
     ~0.5ms      ~1ms           ~0.5ms                   ~0.5ms     ~1ms
                                                         ≈4ms per call
```

Nitro Modules:

```
JS → direct C++ call → Native → direct return → JS
     ~0.01ms                     ~0.01ms
                                 ≈0.02ms per call
```

Plus **batch processing**: send all 500 images in one call and process them
concurrently in native code.

## Requirements

| | |
| --- | --- |
| React Native | `>=0.76` (New Architecture) |
| `react-native-nitro-modules` | `>=0.36.0` — the generated bindings are nitrogen 0.36.x |
| Expo | SDK 55 (the example app targets `~55.0.0`) |
| iOS | 15.1+, **physical device required** (see below) |
| Android | minSdk 24, except `entity-extraction` which needs 26 |

### iOS Simulator does not work

Google ML Kit's iOS pods ship **no `arm64` slice for the Simulator** — for every
version, including 9.0.0. Apps build fine and then fail to run there. **All iOS
testing must happen on a physical device.** This is an ML Kit constraint, not
something this library can work around.

## Repository layout

```
react-native-nitro-mlkit/
├── packages/          → the 16 @nitro-mlkit/* packages
├── example/           → Expo demo app (see below)
├── benchmark/         → reproducible benchmark harness + methodology
└── HANDOFF.md         → full project history & architecture decisions
```

Each package installs independently, so you only download the ML Kit models you
actually need (~3–6 MB each) instead of a ~17 MB+ mega-package. Each has its own
Expo config plugin and uses Nitro HybridObjects for zero-copy data transfer.

## Example app

[`example/`](./example) is an Expo app that doubles as the manual test bed and the
demo:

- a launcher grid with a screen per ML Kit feature, on-image overlays (pose
  landmarks, object/barcode boxes, face mesh) and confidence meters
- **Gallery Wrapped** — scans up to 500 gallery photos in native batch and builds
  a "wrapped" (speed, persona, themes, faces & smiles, top labels)
- **Photo Cleaner** — groups bursts, picks the best shot (open eyes + smile),
  finds screenshots, and offers a gated delete
- **The Race** — this library vs the alternatives, live, on your own photos

```bash
pnpm install
cd example && npx expo run:android      # or run:ios on a physical device
```

## Contributing

PRs welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

The single most useful contribution right now is **iOS on-device validation** of
the 8 packages marked ⚠️ above.

## License

MIT — see [LICENSE](./LICENSE). Google ML Kit is free for commercial use;
MobileFaceNet (planned for `v0.2.0` recognition) is Apache 2.0.
