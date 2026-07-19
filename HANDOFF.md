# HANDOFF — react-native-nitro-mlkit

> Last updated: 2026-07-18 (session 7)  
> Author: @pologonzalo  
> Repo: https://github.com/pologonzalo/react-native-nitro-mlkit

> 🚨 **Newest state is Session 7 at the bottom** — betas published (10 pkgs),
> native `detectBatch` classification, Photo Cleaner + reusable utils, Memories 2.0
> tuned on a real gallery. Urgent next steps are listed there.

## ⚡ Session 2 update — face-detection now runs end-to-end

`@nitro-mlkit/face-detection` **compiles and runs on Android** (verified live on a Pixel_9 emulator: app boots to the demo screen, HybridObject registers, no crash). It also **compiles clean on iOS** (Xcode `BUILD SUCCEEDED`) but **cannot run on the iOS Simulator** — Google ML Kit's iOS pods have no `arm64` Simulator slice (all versions, incl. 9.0.0). Verify iOS on a **physical device**.

What was fixed this session:
- Added `nitro.json` to image-labeling + face-recognition; ran nitrogen on all 3 (had to extract anonymous `{concurrency?}` option objects to named interfaces — nitrogen rejects anonymous objects).
- Wrote the Android native glue for face-detection that nitrogen does NOT generate: `android/CMakeLists.txt`, `android/src/main/cpp/cpp-adapter.cpp` (the `JNI_OnLoad` → `registerAllNatives()` — the critical missing piece), CMake/prefab/abiFilters wiring in `build.gradle`, an Expo `Module()` (`NitroMLKitFacePackage`) registered via `expo-module.config.json`, and an eager `requireOptionalNativeModule("NitroMLKitFace")` in `src/index.ts` (Android lazy-loads Expo modules).
- iOS: removed dead `margelo.nitro.HybridContext()` boilerplate from the Swift impl; podspec now uses `add_nitrogen_files` + `s.module_name = "NitroMLKitFace"` (must match `nitro.json` iosModuleName) + guarded empty `.tflite` resource_bundles + iOS min 15.1.
- `nitro.json` autolinking now lists `FaceDetector` (modern `ios/android` syntax) so registration code is generated.
- Example app: created `app/` (expo-router) + `metro.config.js` (monorepo) + `tsconfig.json`; pinned react/react-native workspace-wide and aligned SDK-55 deps.
- Config plugin: added missing `@expo/config-plugins` dep + `tools:replace` on the MLKit meta-data (conflicted with expo-camera's barcode meta-data).

Build/run recipe & env quirks are saved in project memory (LANG=UTF-8 for pods, ANDROID_HOME, Metro on :8082, RN dedupe).

### Benchmark (session 3)

Added `benchmark/` — a reproducible face-detection benchmark vs `@react-native-ml-kit/face-detection@2.0.1` (classic bridge, **same ML Kit 16.1.7** underneath, so it isolates the JS↔native architecture). Harness is a route in the example app (`example/app/benchmark.tsx`, reachable from the home screen), image prep is `benchmark/prepare-images.sh`. Full methodology + caveats in `benchmark/README.md`.

Android results (Pixel_9 emulator, API 36, 500 imgs, median of 3): single-call **~1.16×**, sequential-500 **~1.16×**, native **batch-500 ~1.6×** vs the competitor's sequential loop (it has no batch API). Honest read: the per-call bridge win is modest because ML Kit inference dominates; the batch/concurrency win is the real story and widens with larger images. iOS benchmark still pending (needs a physical device). Not yet included: `@infinitered/react-native-mlkit-face-detection` as a 3rd bar (its hook-based API needs an imperative adapter).

**Note on the port dance**: 8081 was free this session, so Metro ran on **8081** (not 8082 as an earlier memory says) with `adb reverse tcp:8081 tcp:8081` — simplest when 8081 is free. The debug APK defaults to `localhost:8081`; a `<Link asChild>` with an **array** `style` prop is a hard render error in this expo-router (flatten it).

## What is this?

A monorepo of Nitro Modules wrapping Google ML Kit for React Native. The goal is to replace the deprecated `expo-face-detector` (3.8K downloads/week orphaned) and provide the fastest ML Kit wrapper in the ecosystem — zero bridge overhead via Nitro, plus batch processing that no other package offers.

## Why it exists

1. **`expo-face-detector` is deprecated** (removed in SDK 51, last publish 2+ years ago) — no modern replacement exists
2. **Existing packages** (`@react-native-ml-kit/face-detection`, `@infinitered/react-native-mlkit-face-detection`) use the old bridge — slow for batch processing (500+ photos)
3. **Remin** (our party game app) needs to scan player galleries for faces — batch processing is critical
4. **Claude MAX for OSS** — needs 200K+ combined monthly downloads; this fills a real ecosystem gap

## Architecture decisions

### Why MLKit (not InspireFace, not CLIP)

| Option              | Verdict                   | Reason                                                                                          |
| ------------------- | ------------------------- | ----------------------------------------------------------------------------------------------- |
| **MLKit**           | ✅ Chosen                 | Free commercial license, bundled on-device, maintained by Google, ~6MB per module               |
| InspireFace         | ❌ Rejected               | Models are academic-only license (InsightFace restriction), 134MB package size                  |
| CLIP via ExecuTorch | ❌ Rejected for detection | 150MB+ models, overkill for categorization when MLKit Image Labeling gives 400+ labels for free |

### Why MobileFaceNet for recognition

MLKit detects faces but **does NOT identify people** (Google privacy policy). For "this is Marcos, find all Marcos photos" we need face embeddings. MobileFaceNet:

- Apache 2.0 license (commercial OK)
- ~5MB model
- 128-d embeddings
- Good accuracy for our use case (party game, not security)

### Why monorepo with separate packages

MLKit modules add ~3-6MB each. Users should only install what they need:

```
@nitro-mlkit/face-detection    → 6MB (MLKit face)
@nitro-mlkit/image-labeling    → 6MB (MLKit labeling, 400+ categories)
@nitro-mlkit/face-recognition  → 5MB (MobileFaceNet, depends on face-detection)
```

vs one mega-package: ~17MB+ even if you only need face detection.

## What's done

### `@nitro-mlkit/face-detection` (most complete)

- [x] **Nitro TypeScript spec** — `src/specs/FaceDetector.nitro.ts` with all types (enums, structs, HybridObject)
- [x] **Nitrogen codegen** — 66 generated C++/Swift/Kotlin bridge files in `nitrogen/generated/`
- [x] **iOS Swift implementation** — `ios/HybridFaceDetector.swift` conforms to `HybridFaceDetectorSpec`
  - `detect()` — single image, full options (landmarks, classifications, performance mode)
  - `detectBatch()` — N images, controlled concurrency via TaskGroup
  - `detectPrimary()` — selfie optimization (returns largest face)
  - `cropFaces()` — detect + crop in one native call, returns temp file URIs
  - `compareFaces()` — cosine similarity normalized to [0,1]
  - `extractEmbedding()` / `extractPrimaryEmbedding()` / `detectAndEmbed()` — **STUBS**, waiting for MobileFaceNet model integration
- [x] **iOS Podspec** — `NitroMLKitFaceDetection.podspec` with `GoogleMLKit/FaceDetection ~> 7.0` dependency
- [x] **Android build.gradle** — `com.google.mlkit:face-detection:16.1.7` bundled (offline)
- [x] **Android Kotlin implementation** — `HybridFaceDetector.kt` written but **NOT yet adapted to generated spec signatures** (next task)
- [x] **Expo config plugin** — `plugin/src/index.js` adds MLKit meta-data to AndroidManifest
- [x] **nitro.json** — configured for namespace `mlkit.face`

### `@nitro-mlkit/image-labeling`

- [x] Nitro TypeScript spec — `label()`, `labelBatch()`, `checkSafety()`, `checkSafetyBatch()`, `matchCategories()`
- [x] Package.json, podspec, build.gradle, AndroidManifest
- [ ] **Nitrogen codegen NOT YET RUN** — need to run `cd packages/image-labeling && npx nitrogen`
- [ ] **No native implementation yet** — Swift and Kotlin need to be written

### `@nitro-mlkit/face-recognition`

- [x] Nitro TypeScript spec — `registerPerson()`, `findPeople()`, `findPeopleInPhotos()`, `identifyFace()`, person registry
- [x] Package.json, podspec
- [ ] **Nitrogen codegen NOT YET RUN**
- [ ] **No native implementation yet**
- [ ] **MobileFaceNet .tflite model not yet downloaded/bundled**

### Example app

- [x] Expo app structure (`example/`) with `app.json`, `package.json`
- [x] Main screen: pick image → detect → crop → batch demo
- [ ] **Not yet runnable** — needs `pnpm install` + `pod install` + native build

## What needs to be done (ordered by priority)

### ✅ P0 — DONE (session 2): face-detection compiles & builds on both platforms

All P0 items are complete:
- ✅ Android Kotlin adapted to the generated spec + full native wiring (CMakeLists, cpp-adapter `JNI_OnLoad`, gradle prefab/abiFilters, Expo module). `libNitroMLKitFace.so` (arm64-v8a) + `app-debug.apk` build.
- ✅ `nitro.json` added to image-labeling + face-recognition; nitrogen run on all 3.
- ✅ Example app wired (`app/` router, `metro.config.js`, `tsconfig.json`) — iOS `.app` and Android `.apk` both build.

⚠️ **iOS Simulator cannot RUN face-detection** — Google ML Kit iOS pods have no `arm64` Simulator slice. The Xcode build succeeds, but the app won't install on the Simulator. **Verify iOS on a physical device.** Android has no such limit.

✅ **Runtime QA passed on Android** (Pixel_9 emulator, API 36, 2026-07-14, live): picked a real portrait → **`detect()` → "Found 1 face(s)"** with correct classifications (smile 99%, left-eye-open 99%, bounds 322×368); **`cropFaces()` → "Got 1 face crop(s)"** (native bitmap crop + temp JPEG write); **`detectBatch()` (10×) → "Processed 10 images, found 10 total faces, all in ONE bridge call"** (coroutine chunked concurrency). No crash, 0 errors/warnings in JS logs. The full native path (JNI → Kotlin → MLKit → back to JS) works end-to-end.
- Embedding methods still throw the "model not yet loaded" stub — expected (P1).

### P1 — Download MobileFaceNet model + finish embeddings (unblocks Remin recognition)

- `extractEmbedding()`, `extractPrimaryEmbedding()`, `detectAndEmbed()` are still **STUBS** in both `HybridFaceDetector.swift` and `.kt` (throw "model not yet loaded. Coming in v0.2.0").
- Get `mobilefacenet.tflite` from https://github.com/nicklockwood/mobilefacenet or TensorFlow Hub.
- Place in `packages/face-detection/ios/models/` (podspec `resource_bundles` is guarded — it activates once a `.tflite` is present) and `packages/face-detection/android/src/main/assets/`.
- Write TFLite inference in Swift/Kotlin (add `TensorFlowLiteSwift` pod / `org.tensorflow:tensorflow-lite` gradle dep).

### P2 — Image labeling native impl (`@nitro-mlkit/image-labeling`)

- nitrogen codegen ✅ done; native impl **not written yet** and **not wired to a runnable app**.
- Write `HybridImageLabeler.swift` + `.kt` + the same Android glue face-detection has (CMakeLists, cpp-adapter, Expo module, `requireOptionalNativeModule` in `src/index.ts`).
- MLKit API: `ImageLabeler.process(image)` → array of `ImageLabel(text, confidence, index)`.
- Safety check: filter labels like "underwear", "swimwear", "lingerie", etc.

### P3 — Face recognition native impl (`@nitro-mlkit/face-recognition`)

- nitrogen codegen ✅ done; native impl **not written yet**. Depends on P1 (needs the MobileFaceNet embedding path).
- Write `HybridFaceRecognizer.swift` + `.kt` + Android glue.
- In-memory registry: `Dictionary<String, (name, embedding)>`.
- `registerPerson()`: detect primary face → crop → MobileFaceNet → store embedding.
- `findPeopleInPhotos()`: batch detect → crop each face → embed → compare vs registry.
- `clearRegistry()`: wipe between game sessions.

### P4 — Publish v0.1.0

- Consider emitting real declarations (`tsc` build to `lib/`) instead of shipping `src/`.
- `pnpm publish` each package to npm under `@nitro-mlkit` scope.
- Add to https://reactnative.directory/.
- Add GitHub topics: `react-native`, `nitro`, `mlkit`, `face-detection`, `expo`.

### Cleanup / hygiene (do before committing)

- **Build artifacts are untracked in git**: `packages/face-detection/android/{build,.gradle,.cxx}/` and `example/{ios,android}/`. Add them to `.gitignore` (native dirs are generated by `expo prebuild` and should not be committed).
- Nothing has been committed this session — `git status` shows all the session's changes as unstaged.

## Key files to understand

```
packages/face-detection/
├── src/specs/FaceDetector.nitro.ts    ← THE SOURCE OF TRUTH — defines the API
├── nitrogen/generated/               ← Auto-generated, DO NOT EDIT
│   ├── shared/c++/                   ← C++ structs, enums, HybridObject spec
│   ├── ios/swift/                    ← Swift protocols, struct bridges
│   └── android/kotlin/               ← Kotlin interfaces, struct mappings
├── ios/HybridFaceDetector.swift      ← YOUR CODE — conforms to generated protocol
├── android/.../HybridFaceDetector.kt ← YOUR CODE — needs to extend generated class
└── NitroMLKitFaceDetection.podspec   ← iOS build config
```

**The workflow**: Edit `.nitro.ts` spec → run `npx nitrogen` → implement in Swift/Kotlin → test in example app.

## Technical notes

- **Nitrogen requires numeric enums** (not string unions). `"fast" | "accurate"` → `enum PerformanceMode { FAST = 0, ACCURATE = 1 }`
- **Nitrogen (0.36.1) rejects anonymous object types.** An inline `options?: { concurrency?: number }` param fails codegen with _"Anonymous objects cannot be represented in C++"_. Extract every such shape into a named `interface` (this bit both image-labeling and face-recognition — fixed by adding `BatchSafetyOptions` / `FindPeopleOptions`).
- **Optional properties and `interface extends` ARE supported** in nitrogen 0.36.1 (earlier handoff notes said otherwise — they were wrong for this version). `BatchLabelOptions extends LabelingOptions` and `error?: string` both codegen fine. Optional fields map to nullable/`undefined` on the native side.
- **All numbers are `Double`** in the generated Swift/Kotlin, even if they're semantically integers (faceIndex, trackingId). Runtime `Double` in Swift, `Double` in Kotlin; arrays are `[T]` / `Array<T>` and number arrays become `[Double]` / `DoubleArray`.
- **The native glue nitrogen does NOT generate** (you must write per package): `android/CMakeLists.txt`, `android/src/main/cpp/cpp-adapter.cpp` (`JNI_OnLoad` → `registerAllNatives()`), gradle `externalNativeBuild`/`prefab`/`abiFilters`, an Expo `Module()` listed in `expo-module.config.json`, and an eager `requireOptionalNativeModule("<iosModuleName>")` in `src/index.ts` for Android. See `packages/face-detection/android/` as the reference.
- **MLKit on Android**: use bundled version (`com.google.mlkit:...`) not thin/Play Services version, for offline-first
- **MLKit on iOS**: pods are `GoogleMLKit/FaceDetection` and `GoogleMLKit/ImageLabeling`

## Session 4 — full ML Kit suite build-out (branch `session/face-detection-beta-prep`)

Goal set by the user: wrap **every** ML Kit API as an independent `@nitro-mlkit/*`
package (install-only-what-you-use; each ships its own ML Kit dep + `.so`).

**9 packages built + verified live on the Pixel 9 emulator (API 36), all committed:**

| Package | Verified | npm |
| --- | --- | --- |
| `face-detection` | detect/crop/batch | ✅ beta published (`0.1.0-beta.0`) |
| `image-labeling` | label 8@433ms, batch 160 | committed, not published |
| `barcode-scanning` | QR→URL 117ms, EAN→PRODUCT 11ms, batch 20 | committed |
| `text-recognition` | OCR "Hello Nitro MLKit" 190ms, batch 20 | committed |
| `object-detection` | pipeline 200ms (0 objects on a face = expected) | committed |
| `pose-detection` | 33 landmarks 430ms (nose 96%, hips 0% off-frame) | committed |
| `language-id` | en 100%, es 99%, ~70ms (text, no image) | committed |
| `face-mesh` | 468 3D points 180ms | committed |
| `selfie-segmentation` | 128×128 mask PNG, 54% fg, 76ms (clean silhouette) | committed |

Per-package recipe, tooling notes, and the remaining tail live in the
`nitro-mlkit-suite` project memory. Key facts:
- **Node 22 required** (`.nvmrc`) — pnpm 10.x uses `node:sqlite`; Node 20 breaks `pnpm install` (and EAS local builds).
- **`nitro.json` `autolinking` block MUST be filled** or `createHybridObject` fails at runtime.
- **`package.json` `files` must be scoped to source** (don't glob whole `android/` — it pulls 600 MB of `.cxx`/`build`). Tarballs are ~20-40 kB.
- Codegen binary is **`nitrogen`** (run from the package dir), not `nitro-codegen`.
- Each new package's native glue was generated with a parameterized script; the pattern is the same 4 pieces as face-detection.

**Remaining ML Kit APIs (the harder/odd tail):** `smart-reply` (text, easy);
`translation`, `entity-extraction`, `subject-segmentation` (need a RUNTIME model
download — slower/flakier to verify on emulator); `digital-ink` (stroke input,
not an image); `document-scanner` (full-screen Activity flow, not a still-image
API — wrap differently or skip).

## Session 5 — suite complete (15 packages) + iOS Swift port + demo redesign

**Android suite is COMPLETE: 15 packages, every one verified live on the Pixel 9
emulator.** Added since session 4: `smart-reply` (Android-only; "Sure!/Sure/Yes!"
58ms), `translation` (en→es "Hola, ¿cómo estás hoy?" 2.5s incl. model dl),
`entity-extraction` (Android-only; phone+email 480ms), `subject-segmentation`
(Android-only GMS; native path verified, optional model dl slow on emulator),
`digital-ink` (canvas strokes → 9 candidates 10.5s), `document-scanner`
(Android-only GMS; launches full-screen scanner Activity → returns 1 page + PDF,
verified end-to-end via an Activity-result↔Promise coroutine bridge).

**iOS Swift port written (commit e291803) — NOT compiled.** The 9 cross-platform
packages now have `ios/Hybrid<X>.swift` (barcode, labeling, text, objects, pose,
selfie-seg, language-id, translation, digital-ink), each conforming to the
generated `Hybrid<X>Spec`. GoogleMLKit has no arm64 Simulator slice, so they must
be built on a physical iPhone; the commit message lists the exact MLKit-iOS API
points likely to need a fix on first device build. The 4 Android-only APIs
(smart-reply, face-mesh, entity-extraction, subject-segmentation) have no iOS.

**Demo app redesigned:** native expo-router headers + back button, launcher-grid
home, `SamplePicker` (camera/gallery + ~10 curated stock thumbnails, download on
tap), on-image overlays (pose landmarks, object/barcode boxes, face mesh),
confidence meters. `src/theme.ts` + `src/ui.tsx` + `src/samples.ts`.

**Build gotchas (this session):** entity-extraction needs `minSdkVersion 26`
(set via `expo-build-properties` in app.json); subject-segmentation +
document-scanner are GMS artifacts (`com.google.android.gms:play-services-mlkit-*`)
needing a `com.google.mlkit.vision.DEPENDENCIES` manifest meta-data; digital-ink
classes live under `...vision.digitalink.recognition.*`; run `expo run:android`
WITHOUT `| tail` (it buffers); stale Gradle daemons with a node-less PATH →
`./gradlew --stop` then rebuild with Node 22.

**Still pending (needs the user / a physical device):**
- **iOS on device:** the full-suite `.ipa` now **compiles + signs** (see Session 6);
  still needs to be **run + verified on a physical iPhone** (runtime behaviour of the
  9 cross-platform packages on-device is unconfirmed). Install
  `example/build-1784122316608.ipa` via Expo Orbit or
  `xcrun devicectl device install app --device <UDID> example/build-*.ipa`.
- **npm:** publish the committed betas (`npm publish --access public --tag beta`
  per pkg dir — needs npm login). Only face-detection is published so far.
- **git:** merge `session/face-detection-beta-prep` → `main` + tag.
- **v0.2:** face-recognition iOS (TFLite embedding path — was made Android-only) +
  the `FaceModel` enum.

## Session 6 (2026-07-15)

- **Gallery Wrapped demo** (`example/app/gallery.tsx` + `src/gallery-insights.ts` +
  home banner): asks photo permission, scans up to 500 gallery photos in native
  batch (image-labeling + face-detection concurrently, chunked), shows a fun
  "wrapped" (speed hero photos/s, persona, theme buckets, faces/smiles, top labels).
  Added `expo-media-library`. **Verified live on Pixel 9: 31 photos in 0.6 s (~53/s).**
  iOS: resolves `ph://` → `localUri` before scanning.
- **iOS build is GREEN** — first full-suite `.ipa` (`example/build-1784122316608.ipa`,
  82.7 MB, ad-hoc, includes the user's iPhone UDID). Built via
  `eas build -p ios --profile device --local` (headless). Fixes: podspecs now use
  Nitrogen `add_nitrogen_files` + `s.module_name` (fixed `'<regex>' file not found`);
  4 Swift fixes (barcode `.driversLicense`, selfie-seg `CVPixelBufferGetWidth/Height`,
  digital-ink failable init + `t: Int` + top-level `StrokePoint`/`Stroke`);
  face-recognition → **Android-only** (its TFLite podspec broke `pod install`).
- **Env:** created `~/.zshenv` so the Claude Bash tool (non-login zsh) resolves
  node22/pnpm/adb/fastlane/eas; the harness clobbers PATH so prefix commands with
  `source ~/.zshenv`.

## Session 7 (2026-07-18) — real-iPhone tuning, native classification, Photo Cleaner, betas published

Everything below is on `main` (PRs #1 + #2 merged). Verified live on the user's
**real iPhone** via an EAS **dev-client** build + Metro (JS hot-reloads; only the
`detectBatch` classification needed the rebuild).

### 🚨 URGENT — next steps (start here)

- **Test the Photo Cleaner on the real device** (JS-only — just reload, no rebuild):
  🧹 Photo Cleaner → *Find clutter*. Verify (1) burst grouping makes sense
  (8 s / ±1 face heuristic), (2) best-shot picking (open eyes + smile), (3) delete
  flow (OS "Delete N?" confirm). Then iterate the heuristic in `src/photo-quality.ts`.
- **iOS on-device runtime of the 9 cross-platform packages is still UNCONFIRMED**
  (they compile + sign; on-device behaviour unverified) — carried from session 6.
- **SDK 55 → 57 upgrade deferred** (latest is Expo SDK 57 / RN 0.84+). Do it as its
  own task before the next betas — needs a rebuild + recompiling the `@nitro-mlkit/*`
  packages against the new RN.
- **v0.2:** face-recognition embeddings (MobileFaceNet TFLite) + iOS recognition.

### Shipped this session

- **npm betas — 10 packages live under the `beta` tag:**
  `@nitro-mlkit/face-detection@0.1.0-beta.1` (⭐ has the new per-face classification),
  the other 9 at `0.1.0-beta.0` (barcode-scanning, digital-ink, image-labeling,
  language-id, object-detection, pose-detection, selfie-segmentation,
  text-recognition, translation). **6 Android-only / stub packages intentionally NOT
  published** (face-mesh, face-recognition, smart-reply, subject-segmentation,
  entity-extraction, document-scanner). Publish with `scripts/publish-beta.sh`
  (now resilient — skips already-published versions, prints a published/skipped
  summary; needs `npm login`). Install: `npm i @nitro-mlkit/<pkg>@beta` + native rebuild.
- **Native: `detectBatch` gained an optional `FaceDetectionOptions` 3rd arg** →
  real per-face `smilingProbability` + `*EyeOpenProbability` across a whole batch
  when `classifications: true`. `detect()` + `detectBatch()` now build & **cache** a
  detector matching the requested options (also fixes `detect()` having ignored
  classifications/tracking/minFaceSize). Spec updated + **nitrogen bindings
  regenerated** (0.36.1). **Verified on a real iPhone** (201 smiling across 1098
  faces). ⚠️ Requires a native rebuild to take effect.
- **Photo Cleaner (`example/app/cleaner.tsx`) + reusable utils** — the example is a
  testbed for utils destined for the user's **main app** (see the
  `example-utils-for-main-app` project memory):
  - `example/src/photo-quality.ts` — pure, testable scoring/grouping: `faceShotScore`
    (open eyes dominate, smile is a bonus), `bestShotScore` (worst face weighted
    heavily), `groupSimilar` (time + face-count bursts), `pickBest`, `isScreenshot`,
    `buildCleanupPlan`.
  - `example/src/photo-scan.ts` — one shared gallery scan (labels + classified faces)
    with a **session cache**, so Wrapped and Cleaner don't each re-scan.
    `example/app/gallery.tsx` was refactored onto it.
  - Cleaner UI: bursts (keeper highlighted + % quality, extras dimmed) → screenshot
    pile with % of roll → per-section delete gated by the OS "Delete N photos?" dialog.
- **Memories 2.0 tuned against a real 570-photo gallery (2 passes):** `has()` is now a
  whole-token match — killed "cat" ⊂ "va**cat**ion" (pets 163 → 30) and "text" ⊂
  "**text**ile" (screens 101 → 41). Added `trips` (vacation ×136) + `glam` (dress/gown).
  Repaired `party` (event/crowd + a real group — real rolls have no drink labels).
  Smiles now real via classification (0 → 201). Calibration report card gated behind
  `__DEV__`.
- **Fixes (all JS, hot-reloaded):**
  - iOS Gallery scan no longer stalls at 0/N — URIs resolve per-chunk with
    `shouldDownloadFromNetwork: false` (never downloads iCloud-only originals; skips +
    counts them). The old up-front pass silently downloaded from iCloud → looked frozen.
  - **The Race** degrades gracefully when a competitor's native module isn't linked
    (`@react-native-ml-kit/face-detection` is a legacy `RCT_EXPORT_MODULE` bridge that
    doesn't autolink under the New Architecture) — it races whoever's present and shows
    the rest as "not in this build" instead of crashing.
  - Scan throughput is robust to the app being backgrounded mid-scan (per-chunk timing,
    suspension outliers clamped to the median — a real run reported 8.6 h before this).
- **Tooling:** added `@expo/vector-icons` (real Apple/Play platform badges, no robot
  emoji) + `expo-dev-client` + the `development` EAS profile.

## Context: Remin (the app that will use this)

Remin is a party photo game where players guess whose photos are shown. This library enables:

1. Players take selfies → `extractPrimaryEmbedding()` → register in game session
2. App scans all players' galleries → `detectAndEmbed()` batch → find photos with players' faces
3. MLKit Image Labeling categorizes photos → "beach", "pet", "birthday" → generates contextual questions
4. Game shows photo on TV, players vote from their phones

See the Remin handoff at `/Users/polo/Sites/remin/HANDOFF.md` for that project's context.
