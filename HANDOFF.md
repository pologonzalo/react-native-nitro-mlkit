# HANDOFF — react-native-nitro-mlkit

> Last updated: 2026-07-13 (session 2)  
> Author: @pologonzalo  
> Repo: https://github.com/pologonzalo/react-native-nitro-mlkit

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

## Context: Remin (the app that will use this)

Remin is a party photo game where players guess whose photos are shown. This library enables:

1. Players take selfies → `extractPrimaryEmbedding()` → register in game session
2. App scans all players' galleries → `detectAndEmbed()` batch → find photos with players' faces
3. MLKit Image Labeling categorizes photos → "beach", "pet", "birthday" → generates contextual questions
4. Game shows photo on TV, players vote from their phones

See the Remin handoff at `/Users/polo/Sites/remin/HANDOFF.md` for that project's context.
