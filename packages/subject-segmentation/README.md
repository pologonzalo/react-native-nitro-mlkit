# React Native ML Kit — Subject Segmentation

**`@nitro-mlkit/subject-segmentation`** · on-device Google ML Kit via [Nitro Modules](https://github.com/mrousavy/nitro) — JSI, no bridge.

> ⚠️ **Beta (`0.1.0-beta.x`).** **Android-only.** Native path verified on-device;
> the full run needs the Google Play optional model, which downloads on first use
> (slow on emulators). See [Platform status](#platform-status).

> 🚧 **Not published on npm.** This package is Android-only, so it is held back
> from the registry until it has an iOS implementation. It works today if you
> consume it from the [monorepo](https://github.com/pologonzalo/react-native-nitro-mlkit)
> — see [Installation](#installation).

High-performance, on-device **subject segmentation** for React Native, built with
[Nitro Modules](https://github.com/mrousavy/nitro) (JSI, no bridge).

Powered by **Google ML Kit**. Cuts out the main **subject(s)** of a photo from
the background and returns a transparent **PNG cutout**. Downloads a small model
at runtime on first use, then runs **entirely on-device** — no network.

## Installation

This package is **not on npm yet** (Android-only — see the notice above). To use
it today, clone the monorepo and point your app at the workspace package:

```bash
git clone https://github.com/pologonzalo/react-native-nitro-mlkit
cd react-native-nitro-mlkit && pnpm install
```

Then add it to your app as a file dependency and rebuild:

```json
{ "dependencies": { "@nitro-mlkit/subject-segmentation": "file:../react-native-nitro-mlkit/packages/subject-segmentation" } }
```

No config plugin (autolinked Expo module). Install and `npx expo prebuild`.
Not available in Expo Go.

## Usage

```ts
import { NitroSubjectSegmenter } from "@nitro-mlkit/subject-segmentation";

const { foregroundUri, width, height, subjectCount } =
  await NitroSubjectSegmenter.segment(imageUri);
// foregroundUri -> a PNG cutout of the subject(s) with a transparent
// background; render it, composite it, or save it.

NitroSubjectSegmenter.isAvailable(); // true on Android, false elsewhere
```

### `SubjectSegmentationResult`

| field | type | notes |
| ----- | ---- | ----- |
| `foregroundUri` | `string` | `file://` uri of a transparent PNG cutout of the subject(s) |
| `width` | `number` | cutout width in pixels |
| `height` | `number` | cutout height in pixels |
| `subjectCount` | `number` | number of distinct subjects found |

## Notes

- **First call downloads a model.** ML Kit fetches the subject-segmentation
  model on first use; that call is slower and needs connectivity. Subsequent
  calls are fully on-device.
- **Beta ML Kit dependency.** Uses `com.google.mlkit:segmentation-subject`
  (currently a `beta` artifact).

## Platform status

| Platform | Min | Status |
| -------- | --- | ------ |
| Android  | API 26+ | ⚙️ Native path verified (Pixel 9, API 36); full result pending Google Play optional-model download (slow on emulator — validate on a real device) |
| iOS      | —   | ❌ Not supported — Google ML Kit has **no** Subject Segmentation API on iOS |

`isAvailable()` returns `false` on iOS and `segment()` rejects there, so you can
call it safely from cross-platform code and gate on the result.

## Part of `nitro-mlkit`

The full ML Kit suite on Nitro — see the other `@nitro-mlkit/*` packages.

## License

MIT © Gonzalo Polo
