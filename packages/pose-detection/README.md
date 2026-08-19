# React Native ML Kit — Pose Detection

**`@nitro-mlkit/pose-detection`** · on-device Google ML Kit via [Nitro Modules](https://github.com/mrousavy/nitro) — JSI, no bridge.

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

Add the config plugin to your `app.json`, then prebuild:

```json
{ "plugins": ["@nitro-mlkit/pose-detection"] }
```

```bash
npx expo prebuild
```

The plugin keeps arm64-Simulator builds *linking* on iOS (Google ML Kit ships
no Simulator slice — inference itself needs a physical device, where every
method throws a clear error on the Simulator). It shares its Podfile hook with
every other `@nitro-mlkit/*` plugin, so any combination works in any order.
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

All 33 landmarks are returned whenever a body is found; joints outside the
frame come back with a low `inFrameLikelihood`. `z` is depth relative to the
body's hip midpoint (negative = toward the camera) — useful for
left-vs-right disambiguation, not metric depth.

### Options

```ts
import { NitroPose, PerformanceMode, DetectorMode } from "@nitro-mlkit/pose-detection";

// Accurate model — better landmark precision, higher latency
const landmarks = await NitroPose.detect(uri, {
  performanceMode: PerformanceMode.ACCURATE,
});

// Video / camera frames of the same scene: STREAM tracks across frames
// instead of re-detecting each one (faster, less jitter). Wrong for
// unrelated photos — the default SINGLE_IMAGE treats each image independently.
const results = await NitroPose.detectBatch(frameUris, 2, {
  detectorMode: DetectorMode.STREAM,
});
```

Detectors are built once per option combination and cached natively.

> 📦 **Size note:** both BlazePose models ship in the binary (base ~10 MB,
> accurate ~13 MB) so the choice is a runtime option rather than an
> install-time fork. If that ever hurts, say so in an issue — a build-time
> flag is possible.

### Classifying poses (squats, raised arms, …)

ML Kit's official recipe classifies poses from **joint angles**. The helpers
ship in this package:

```ts
import {
  NitroPose,
  PoseLandmarkType as P,
  getLandmark,
  landmarkAngle,
} from "@nitro-mlkit/pose-detection";

const lms = await NitroPose.detect(uri);
const hip = getLandmark(lms, P.LEFT_HIP);
const knee = getLandmark(lms, P.LEFT_KNEE);
const ankle = getLandmark(lms, P.LEFT_ANKLE);

if (hip && knee && ankle) {
  const kneeAngle = landmarkAngle(hip, knee, ankle); // degrees, 0..180
  const isSquatting = kneeAngle < 120;
}
```

Same idea for anything articulated: a raised arm is a shoulder–elbow–wrist
angle near 180° with the wrist above the shoulder; a push-up bottom is an
elbow angle under ~90°. Gate on `inFrameLikelihood` (> ~0.5) before trusting
a joint.

## Limitations

- **One body per image.** ML Kit Pose only ever reports the most prominent
  person — multi-person detection is an upstream ML Kit limitation, not a
  missing feature here. If two people are in frame you get one of them.
- Works best when the subject's full body is visible; partially out-of-frame
  joints are still estimated but flagged with low `inFrameLikelihood`.

## Platform status

| Platform | Min | Status |
| -------- | --- | ------ |
| Android  | API 21+ | ✅ Verified on-device (Pixel 9, API 36): 33 landmarks in ~430 ms (nose 96%, shoulders ~73%, out-of-frame hips 0%) |
| iOS      | 15.5+   | ⚠️ Swift impl written; on-device build & run pending¹ |
| tvOS/macOS | — | 🔜 Planned |

¹ ML Kit's iOS pods ship no `arm64` Simulator slice; validate on a physical device.

## Part of `nitro-mlkit`

The full ML Kit suite on Nitro — see the other `@nitro-mlkit/*` packages.

## License

MIT © Gonzalo Polo
