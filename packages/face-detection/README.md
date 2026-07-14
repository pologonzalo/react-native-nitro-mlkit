# @nitro-mlkit/face-detection

> ⚠️ **Beta (`0.1.0-beta.x`).** Android is verified on-device. iOS builds, links
> and signs cleanly, but on-device runtime validation is still pending — see
> [Platform status](#platform-status). Recognition/embeddings are **not**
> implemented yet (v0.2.0). The API surface may still change before `0.1.0`.

High-performance, on-device face **detection** for React Native, built with
[Nitro Modules](https://github.com/mrousavy/nitro) — JSI, synchronous crossing,
no bridge and no JSON serialization.

Powered by **Google ML Kit** on both Android and iOS. **All processing happens
on-device — nothing leaves the phone.**

## Why this over existing packages?

| Feature                          | expo-face-detector | @infinitered | **@nitro-mlkit** |
| -------------------------------- | ------------------ | ------------ | ---------------- |
| Maintained                       | ❌ Deprecated      | ✅           | ✅               |
| Nitro / JSI (no bridge overhead) | ❌                 | ❌           | ✅               |
| Native batch API                 | ❌                 | ❌           | ✅               |
| Crop faces natively              | ❌                 | ❌           | ✅               |
| Expo config plugin               | ❌                 | ✅           | ✅               |

On Android, `detectBatch` scans 500 images **~2.9× faster** than the
classic-bridge equivalent and **~4.3×** vs the Expo-module one. Full
methodology and honest caveats in [`benchmark/`](../../benchmark/README.md).

## Installation

```bash
npm install @nitro-mlkit/face-detection@beta react-native-nitro-modules
```

This package contains native code, so it does **not** run in Expo Go — use a
development build or bare workflow.

### Expo

Add the config plugin to your `app.json`, then prebuild:

```json
{ "plugins": ["@nitro-mlkit/face-detection"] }
```

```bash
npx expo prebuild
```

## Usage

```ts
import { NitroFace, PerformanceMode } from "@nitro-mlkit/face-detection";

// Detect faces in one image (all options are required in v0.1)
const faces = await NitroFace.detect(imageUri, {
  performanceMode: PerformanceMode.FAST, // or PerformanceMode.ACCURATE
  landmarks: false,
  classifications: false,
  minFaceSize: 0.1,
  tracking: false,
});
// → [{ bounds, headEulerAngleY, smilingProbability, landmarks, trackingId, ... }]

// Largest face only (selfie optimization)
const primary = await NitroFace.detectPrimary(selfieUri);

// Crop every detected face to temp-file URIs (padding as a fraction of size)
const crops = await NitroFace.cropFaces(photoUri, 0.3);
// → [{ uri, faceIndex, width, height }]

// Native batch — ONE JSI call, N images detected concurrently
const results = await NitroFace.detectBatch(galleryUris, 4 /* concurrency */);
// → [{ index, faces, crops, success }]

// Runtime availability
NitroFace.isAvailable(); // boolean
```

## API

| Method                                | Status                          |
| ------------------------------------- | ------------------------------- |
| `detect(uri, options)`                | ✅                              |
| `detectPrimary(uri)`                  | ✅                              |
| `cropFaces(uri, padding)`             | ✅                              |
| `detectBatch(uris, concurrency)`      | ✅                              |
| `isAvailable()`                       | ✅                              |
| `compareFaces(a, b)`                  | ✅ cosine similarity (0..1)     |
| `extractEmbedding(uri)`               | 🔜 v0.2.0 — **throws** today    |
| `extractPrimaryEmbedding(uri)`        | 🔜 v0.2.0 — **throws** today    |
| `detectAndEmbed(uris, concurrency)`   | 🔜 v0.2.0 — **throws** today    |

### Face recognition / embeddings (coming in v0.2.0)

`extractEmbedding`, `extractPrimaryEmbedding` and `detectAndEmbed` are declared
in the type surface but **not implemented yet** — calling them throws
`"MobileFaceNet model not yet loaded. Coming in v0.2.0"`. MobileFaceNet
embeddings (to find the same person across a photo set) are the next milestone.
`compareFaces` already ships the cosine-similarity math, so it's ready the
moment embeddings land.

## Platform status

| Platform     | Min version | Status                                                           |
| ------------ | ----------- | ---------------------------------------------------------------- |
| Android      | API 21+     | ✅ Verified on-device (Pixel 9 emulator, API 36)                 |
| iOS          | 15.5+       | ⚠️ Builds, links & signs (GoogleMLKit via CocoaPods); device run pending¹ |
| tvOS / macOS | —           | 🔜 Planned                                                       |

¹ Google ML Kit's iOS pods ship no `arm64` **Simulator** slice, so iOS must be
validated on a physical device. The build and code-signing pipeline is green;
a device run is the last box to tick before a stable `0.1.0`.

## License

MIT © Gonzalo Polo
