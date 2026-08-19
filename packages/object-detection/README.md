# React Native ML Kit — Object Detection

**`@nitro-mlkit/object-detection`** · on-device Google ML Kit via [Nitro Modules](https://github.com/mrousavy/nitro) — JSI, no bridge.

> ⚠️ **Beta (`0.1.0-beta.x`).** Android verified on-device; iOS builds & links but
> device runtime is pending — see [Platform status](#platform-status).

High-performance, on-device **object detection & tracking** for React Native,
built with [Nitro Modules](https://github.com/mrousavy/nitro) (JSI, no bridge).

Powered by **Google ML Kit**. Detects prominent objects in an image with
bounding boxes and coarse category labels. **All on-device.**

## Installation

```bash
npm install @nitro-mlkit/object-detection@beta react-native-nitro-modules
```

Add the config plugin to your `app.json`, then prebuild:

```json
{ "plugins": ["@nitro-mlkit/object-detection"] }
```

```bash
npx expo prebuild
```

The plugin keeps arm64-Simulator builds *linking* on iOS (Google ML Kit ships
no Simulator slice — on the Simulator every method throws a clear error; run
on a physical device). It shares its Podfile hook with every other
`@nitro-mlkit/*` plugin, so any combination works in any order. Not
available in Expo Go.

## Usage

```ts
import { NitroObjects } from "@nitro-mlkit/object-detection";

const objects = await NitroObjects.detect(imageUri);
// → [{ bounds:{x,y,width,height}, trackingId, labels:[{text,confidence,index}] }]

// Native batch — one JSI call
const results = await NitroObjects.detectBatch(uris, 4 /* concurrency */);

NitroObjects.isAvailable(); // boolean
```

Uses SINGLE_IMAGE_MODE with multiple objects + coarse classification. ML Kit's
default classifier covers broad categories (Fashion good, Home good, Food,
Place, Plant); it targets prominent *objects*, not faces/people.

## Platform status

| Platform | Min | Status |
| -------- | --- | ------ |
| Android  | API 21+ | ✅ Verified on-device (Pixel 9, API 36): `detect` runs in ~200 ms |
| iOS      | 15.5+   | ⚠️ Swift impl written; on-device build & run pending¹ |
| tvOS/macOS | — | 🔜 Planned |

¹ ML Kit's iOS pods ship no `arm64` Simulator slice; validate on a physical device.

## Part of `nitro-mlkit`

The full ML Kit suite on Nitro — see the other `@nitro-mlkit/*` packages.

## License

MIT © Gonzalo Polo
