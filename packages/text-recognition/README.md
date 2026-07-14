# @nitro-mlkit/text-recognition

> ⚠️ **Beta (`0.1.0-beta.x`).** Android is verified on-device. iOS builds and
> links (GoogleMLKit via CocoaPods) but on-device runtime validation is still
> pending — see [Platform status](#platform-status). API may change before `0.1.0`.

High-performance, on-device **text recognition (OCR)** for React Native, built
with [Nitro Modules](https://github.com/mrousavy/nitro) — JSI, synchronous
crossing, no bridge and no JSON serialization.

Powered by **Google ML Kit**'s bundled **Latin** text-recognition model. Returns
the full recognized text plus a structured `block → line → element` hierarchy
with bounding boxes. **All on-device — nothing leaves the phone.**

## Installation

```bash
npm install @nitro-mlkit/text-recognition@beta react-native-nitro-modules
```

Ships native code, so it does **not** run in Expo Go — use a development build
or the bare workflow. **No config plugin**: it's an Expo module, autolinked
automatically. Just install and prebuild:

```bash
npx expo prebuild
```

## Usage

```ts
import { NitroText } from "@nitro-mlkit/text-recognition";

// Just the text (convenience)
const text = await NitroText.recognizeText(imageUri);
// → "Hello Nitro MLKit"

// Full structured result (blocks -> lines -> elements + bounding boxes)
const result = await NitroText.recognize(imageUri);
// result.text                       -> the whole string
// result.blocks[i].lines[j].text    -> a single line
// result.blocks[i].lines[j].elements[k].bounds -> a word's box

// Native batch — ONE JSI call, N images recognized concurrently
const results = await NitroText.recognizeBatch(galleryUris, 4 /* concurrency */);
// → [{ index, text, success, error? }]

NitroText.isAvailable(); // boolean
```

## API

| Method                              | Status |
| ----------------------------------- | ------ |
| `recognize(uri)`                    | ✅ structured |
| `recognizeText(uri)`                | ✅ flat string |
| `recognizeBatch(uris, concurrency)` | ✅ native concurrency |
| `isAvailable()`                     | ✅     |

Currently ships the **Latin** script model. Chinese / Devanagari / Japanese /
Korean are separate ML Kit models and are a possible future addition.

## Platform status

| Platform     | Min version | Status                                                                                    |
| ------------ | ----------- | ----------------------------------------------------------------------------------------- |
| Android      | API 21+     | ✅ Verified on-device (Pixel 9 emulator, API 36): `recognize` → correct text (1 block/line) in ~190 ms; `recognizeBatch` 20 imgs in one call (~730 ms) |
| iOS          | 15.5+       | ⚠️ Builds & links (GoogleMLKit via CocoaPods); device run pending¹                         |
| tvOS / macOS | —           | 🔜 Planned                                                                                |

¹ Google ML Kit's iOS pods ship no `arm64` **Simulator** slice, so iOS must be
validated on a physical device.

## Part of `nitro-mlkit`

The full ML Kit suite on Nitro. See also
[`@nitro-mlkit/face-detection`](https://www.npmjs.com/package/@nitro-mlkit/face-detection),
[`@nitro-mlkit/image-labeling`](https://www.npmjs.com/package/@nitro-mlkit/image-labeling)
and [`@nitro-mlkit/barcode-scanning`](https://www.npmjs.com/package/@nitro-mlkit/barcode-scanning).

## License

MIT © Gonzalo Polo
