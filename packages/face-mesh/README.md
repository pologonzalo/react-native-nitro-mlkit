# @nitro-mlkit/face-mesh

> ⚠️ **Beta (`0.1.0-beta.x`).** Android verified on-device; iOS builds & links but
> device runtime is pending — see [Platform status](#platform-status).

High-performance, on-device **face mesh detection** for React Native, built with
[Nitro Modules](https://github.com/mrousavy/nitro) (JSI, no bridge).

Powered by **Google ML Kit**. Returns up to **468 3D mesh points** for the
primary face. **All on-device.**

## Installation

```bash
npm install @nitro-mlkit/face-mesh@beta react-native-nitro-modules
```

No config plugin (autolinked Expo module). Install and `npx expo prebuild`.
Not available in Expo Go.

## Usage

```ts
import { NitroFaceMesh } from "@nitro-mlkit/face-mesh";

const points = await NitroFaceMesh.detect(imageUri);
// → [{ index, x, y, z }, ...]  (up to 468 points, or [] if no face)

const results = await NitroFaceMesh.detectBatch(uris, 4 /* concurrency */);

NitroFaceMesh.isAvailable(); // boolean
```

## Platform status

| Platform | Min | Status |
| -------- | --- | ------ |
| Android  | API 21+ | ✅ Verified on-device (Pixel 9, API 36): 468 points in ~180 ms |
| iOS      | 15.5+   | ⚠️ Builds & links (GoogleMLKit); device run pending¹ |
| tvOS/macOS | — | 🔜 Planned |

¹ ML Kit's iOS pods ship no `arm64` Simulator slice; validate on a physical device.

## Part of `nitro-mlkit`

The full ML Kit suite on Nitro — see the other `@nitro-mlkit/*` packages.

## License

MIT © Gonzalo Polo
