# @nitro-mlkit/image-labeling

> ⚠️ **Beta (`0.1.0-beta.x`).** Android is verified on-device. iOS builds and
> links (GoogleMLKit via CocoaPods) but on-device runtime validation is still
> pending — see [Platform status](#platform-status). API may change before `0.1.0`.

High-performance, on-device **image labeling** for React Native, built with
[Nitro Modules](https://github.com/mrousavy/nitro) — JSI, synchronous crossing,
no bridge and no JSON serialization.

Powered by **Google ML Kit**'s bundled image-labeling model (400+ general
labels). **All processing happens on-device — nothing leaves the phone.**

## Installation

```bash
npm install @nitro-mlkit/image-labeling@beta react-native-nitro-modules
```

This package ships native code, so it does **not** run in Expo Go — use a
development build or the bare workflow. It has **no config plugin**: it is an
Expo module, so autolinking picks it up automatically. Just install and prebuild:

```bash
npx expo prebuild
```

## Usage

```ts
import { NitroLabeler } from "@nitro-mlkit/image-labeling";

// Label a single image
const labels = await NitroLabeler.label(imageUri, {
  confidenceThreshold: 0.5, // default 0.5
  maxLabels: 10,            // default 10
});
// → [{ text: "Outerwear", confidence: 0.85, index: 123 }, ...] (sorted desc)

// Native batch — ONE JSI call, N images labeled concurrently
const results = await NitroLabeler.labelBatch(galleryUris, { concurrency: 4 });
// → [{ index, labels, success, error? }]

// Keep only labels matching specific categories
const beachish = await NitroLabeler.matchCategories(imageUri, ["Beach", "Sea", "Mountain"]);

// Runtime availability
NitroLabeler.isAvailable(); // boolean
```

## API

| Method                                    | Status                                   |
| ----------------------------------------- | ---------------------------------------- |
| `label(uri, options?)`                    | ✅                                       |
| `labelBatch(uris, options?)`              | ✅ native concurrency                    |
| `matchCategories(uri, categories)`        | ✅                                       |
| `checkSafety(uri)`                        | ⚠️ heuristic (see below)                 |
| `checkSafetyBatch(uris, options?)`        | ⚠️ heuristic                             |
| `isAvailable()`                           | ✅                                       |

### About `checkSafety` — read this

`checkSafety` / `checkSafetyBatch` are a **best-effort keyword heuristic** over
ML Kit's general labels (flagging a small set like "swimwear", "underwear",
"weapon", "blood"). ML Kit image labeling is **not** a trained NSFW/safety
classifier, so **do not** rely on this for real content moderation — it will
miss things and false-positive. It's here as a convenience filter, not a
safety guarantee. A proper safety model is a possible future addition.

## Platform status

| Platform     | Min version | Status                                                            |
| ------------ | ----------- | ----------------------------------------------------------------- |
| Android      | API 21+     | ✅ Verified on-device (Pixel 9 emulator, API 36): `label` 8 labels in ~430 ms; `labelBatch` 20 imgs / 160 labels in one call |
| iOS          | 15.5+       | ⚠️ Swift impl written; on-device build & run pending¹ |
| tvOS / macOS | —           | 🔜 Planned                                                        |

¹ Google ML Kit's iOS pods ship no `arm64` **Simulator** slice, so iOS must be
validated on a physical device.

## Part of `nitro-mlkit`

The full ML Kit suite on Nitro. See also
[`@nitro-mlkit/face-detection`](https://www.npmjs.com/package/@nitro-mlkit/face-detection).

## License

MIT © Gonzalo Polo
