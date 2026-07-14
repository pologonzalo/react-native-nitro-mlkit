# @nitro-mlkit/pose-detection

> ⚠️ **Beta (`0.1.0-beta.x`).** Android verified on-device; iOS builds & links but
> device runtime is pending — see [Platform status](#platform-status).

High-performance, on-device **pose detection** for React Native, built with
[Nitro Modules](https://github.com/mrousavy/nitro) (JSI, no bridge).

Powered by **Google ML Kit**. Returns the **33 skeletal landmarks** of the
primary body — each with a 3D position and an in-frame likelihood. **On-device.**

## Installation

```bash
npm install @nitro-mlkit/pose-detection@beta react-native-nitro-modules
```

No config plugin (autolinked Expo module). Just install and `npx expo prebuild`.
Not available in Expo Go.

## Usage

```ts
import { NitroPose } from "@nitro-mlkit/pose-detection";

const landmarks = await NitroPose.detect(imageUri);
// → [{ type, x, y, z, inFrameLikelihood }, ...]  (33 landmarks, or [] if no body)
// type is the ML Kit landmark index (0 = nose, 11/12 = shoulders, 23/24 = hips, …)

// Native batch — one JSI call
const results = await NitroPose.detectBatch(uris, 4 /* concurrency */);

NitroPose.isAvailable(); // boolean
```

Runs in SINGLE_IMAGE_MODE. All 33 landmarks are returned whenever a body is
found; joints outside the frame come back with a low `inFrameLikelihood`.

## Platform status

| Platform | Min | Status |
| -------- | --- | ------ |
| Android  | API 21+ | ✅ Verified on-device (Pixel 9, API 36): 33 landmarks in ~430 ms (nose 96%, shoulders ~73%, out-of-frame hips 0%) |
| iOS      | 15.5+   | ⚠️ Builds & links (GoogleMLKit); device run pending¹ |
| tvOS/macOS | — | 🔜 Planned |

¹ ML Kit's iOS pods ship no `arm64` Simulator slice; validate on a physical device.

## Part of `nitro-mlkit`

The full ML Kit suite on Nitro — see the other `@nitro-mlkit/*` packages.

## License

MIT © Gonzalo Polo
