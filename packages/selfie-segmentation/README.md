# React Native ML Kit — Selfie Segmentation

**`@nitro-mlkit/selfie-segmentation`** · on-device Google ML Kit via [Nitro Modules](https://github.com/mrousavy/nitro) — JSI, no bridge.

> ⚠️ **Beta (`0.1.0-beta.x`).** Android verified on-device; iOS builds & links but
> device runtime is pending — see [Platform status](#platform-status).

High-performance, on-device **selfie segmentation** for React Native, built with
[Nitro Modules](https://github.com/mrousavy/nitro) (JSI, no bridge).

Powered by **Google ML Kit**. Separates the person (foreground) from the
background and returns a confidence **mask as a PNG** (alpha = confidence).
**All on-device.**

## Installation

```bash
npm install @nitro-mlkit/selfie-segmentation@beta react-native-nitro-modules
```

No config plugin (autolinked Expo module). Install and `npx expo prebuild`.
Not available in Expo Go.

## Usage

```ts
import { NitroSelfieSegmenter } from "@nitro-mlkit/selfie-segmentation";

const { maskUri, width, height, foregroundRatio } =
  await NitroSelfieSegmenter.segment(imageUri);
// maskUri -> a PNG (white where the person is, alpha = confidence); render it,
// composite it, or use it as a cutout.

const results = await NitroSelfieSegmenter.segmentBatch(uris, 4 /* concurrency */);

NitroSelfieSegmenter.isAvailable(); // boolean
```

## Platform status

| Platform | Min | Status |
| -------- | --- | ------ |
| Android  | API 21+ | ✅ Verified on-device (Pixel 9, API 36): 128×128 mask, ~54% foreground, in ~76 ms |
| iOS      | 15.5+   | ⚠️ Swift impl written; on-device build & run pending¹ |
| tvOS/macOS | — | 🔜 Planned |

¹ ML Kit's iOS pods ship no `arm64` Simulator slice; validate on a physical device.

## Part of `nitro-mlkit`

The full ML Kit suite on Nitro — see the other `@nitro-mlkit/*` packages.

## License

MIT © Gonzalo Polo
