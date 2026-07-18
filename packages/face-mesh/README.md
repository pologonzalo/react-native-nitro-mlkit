# React Native ML Kit — Face Mesh

**`@nitro-mlkit/face-mesh`** · on-device Google ML Kit via [Nitro Modules](https://github.com/mrousavy/nitro) — JSI, no bridge.

> ⚠️ **Beta (`0.1.0-beta.x`) · Android-only.** ML Kit Face Mesh Detection has no
> iOS SDK (there is no `GoogleMLKit/FaceMeshDetection` pod), so this package only
> links on Android — see [Platform status](#platform-status).

High-performance, on-device **face mesh detection** for React Native, built with
[Nitro Modules](https://github.com/mrousavy/nitro) (JSI, no bridge).

Powered by **Google ML Kit**. Returns up to **468 3D mesh points** for the
primary face. **All on-device.**

## Installation

```bash
npm install @nitro-mlkit/face-mesh@beta react-native-nitro-modules
```

No config plugin (autolinked Expo module, **Android-only**). Install and
`npx expo prebuild`. Not available in Expo Go.

On iOS the module is not linked. `NitroFaceMesh` is still importable (so shared
code compiles), but any access throws an `Android-only` error — guard with
`isFaceMeshSupported` before use.

## Usage

```ts
import { NitroFaceMesh } from "@nitro-mlkit/face-mesh";

const points = await NitroFaceMesh.detect(imageUri);
// → [{ index, x, y, z }, ...]  (up to 468 points, or [] if no face)

const results = await NitroFaceMesh.detectBatch(uris, 4 /* concurrency */);

NitroFaceMesh.isAvailable(); // boolean
```

```ts
import { isFaceMeshSupported } from "@nitro-mlkit/face-mesh";

if (isFaceMeshSupported) {
  const points = await NitroFaceMesh.detect(imageUri);
}
```

## Platform status

| Platform | Min | Status |
| -------- | --- | ------ |
| Android  | API 21+ | ✅ Verified on-device (Pixel 9, API 36): 468 points in ~180 ms |
| iOS      | —   | ❌ Not supported — Google ships no ML Kit Face Mesh SDK for iOS |
| tvOS/macOS | — | ❌ Not supported |

ML Kit Face Mesh Detection is an Android-only API. There is no
`GoogleMLKit/FaceMeshDetection` CocoaPod, so the package is not linked on iOS.

## Part of `nitro-mlkit`

The full ML Kit suite on Nitro — see the other `@nitro-mlkit/*` packages.

## License

MIT © Gonzalo Polo
