# HANDOFF — react-native-nitro-mlkit

> Last updated: 2026-07-13  
> Author: @pologonzalo  
> Repo: https://github.com/pologonzalo/react-native-nitro-mlkit

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

### P0 — Make face-detection compile and run

1. **Adapt Android Kotlin to generated spec**
   - Look at `nitrogen/generated/android/kotlin/com/margelo/nitro/mlkit/face/HybridFaceDetectorSpec.kt`
   - Make `HybridFaceDetector.kt` extend the generated base class
   - Match method signatures exactly (all numbers are `Double`, arrays are `List<>`, etc.)

2. **Add `nitro.json` to image-labeling and face-recognition**

   ```json
   // packages/image-labeling/nitro.json
   {
     "cxxNamespace": ["mlkit", "labeling"],
     "ios": { "iosModuleName": "NitroMLKitLabeling" },
     "android": {
       "androidNamespace": ["nitromlkit", "labeling"],
       "androidCxxLibName": "NitroMLKitLabeling"
     },
     "autolinking": {}
   }
   ```

3. **Run nitrogen on remaining packages**

   ```bash
   cd packages/image-labeling && npx nitrogen
   cd packages/face-recognition && npx nitrogen
   ```

4. **Download MobileFaceNet model**
   - Get `mobilefacenet.tflite` from https://github.com/nicklockwood/mobilefacenet or TensorFlow Hub
   - Place in `packages/face-recognition/ios/models/` and `packages/face-recognition/android/src/main/assets/`
   - Write TFLite inference code in Swift/Kotlin for `extractEmbedding()`

5. **Wire example app**
   ```bash
   cd example && pnpm install && cd ios && pod install && cd ..
   npx expo run:ios
   ```

### P1 — Image labeling native impl

- Write `HybridImageLabeler.swift` and `HybridImageLabeler.kt`
- MLKit API is simple: `ImageLabeler.process(image)` returns array of `ImageLabel(text, confidence, index)`
- Safety check: filter labels like "underwear", "swimwear", "lingerie" etc.

### P2 — Face recognition native impl

- Write `HybridFaceRecognizer.swift` and `HybridFaceRecognizer.kt`
- In-memory registry: `Dictionary<String, (name: String, embedding: [Float])>`
- `registerPerson()`: detect primary face → crop → MobileFaceNet → store embedding
- `findPeopleInPhotos()`: batch detect → crop each face → embed → compare vs registry
- `clearRegistry()`: wipe between game sessions

### P3 — Publish v0.1.0

- Add proper `tsconfig.json` build step (emit declarations)
- `pnpm publish` each package to npm under `@nitro-mlkit` scope
- Add to https://reactnative.directory/
- Add GitHub topics: `react-native`, `nitro`, `mlkit`, `face-detection`, `expo`

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
- **No optional properties in Nitro interfaces** — all fields must have values. Use sentinel values (-1 for "no tracking ID", empty array for "no landmarks")
- **No `extends` on option interfaces** — flatten BatchOptions instead of extending FaceDetectionOptions
- **All numbers are `Double`** in the generated Swift/Kotlin, even if they're semantically integers (faceIndex, trackingId)
- **MLKit on Android**: use bundled version (`com.google.mlkit:...`) not thin/Play Services version, for offline-first
- **MLKit on iOS**: pods are `GoogleMLKit/FaceDetection` and `GoogleMLKit/ImageLabeling`

## Context: Remin (the app that will use this)

Remin is a party photo game where players guess whose photos are shown. This library enables:

1. Players take selfies → `extractPrimaryEmbedding()` → register in game session
2. App scans all players' galleries → `detectAndEmbed()` batch → find photos with players' faces
3. MLKit Image Labeling categorizes photos → "beach", "pet", "birthday" → generates contextual questions
4. Game shows photo on TV, players vote from their phones

See the Remin handoff at `/Users/polo/Sites/remin/HANDOFF.md` for that project's context.
