# @nitro-mlkit/face-detection

High-performance on-device face detection for React Native, built with [Nitro Modules](https://github.com/mrousavy/nitro).

Uses Google ML Kit (Android) and Apple Vision framework (iOS). **All processing happens on-device — no data leaves the phone.**

## Why this over existing packages?

| Feature                      | expo-face-detector | @infinitered | **@nitro-mlkit** |
| ---------------------------- | ------------------ | ------------ | ---------------- |
| Maintained                   | ❌ Deprecated      | ✅           | ✅               |
| Nitro (zero bridge overhead) | ❌                 | ❌           | ✅               |
| Batch processing             | ❌                 | ❌           | ✅               |
| Crop faces natively          | ❌                 | ❌           | ✅               |
| Expo config plugin           | ❌                 | ✅           | ✅               |
| tvOS support                 | ❌                 | ❌           | ✅ (planned)     |

## Installation

```bash
npm install @nitro-mlkit/face-detection react-native-nitro-modules
```

### Expo

Add the plugin to your `app.json`:

```json
{
  "plugins": ["@nitro-mlkit/face-detection"]
}
```

## Usage

```typescript
import { NitroFace } from "@nitro-mlkit/face-detection";

// ─── Detection ──────────────────────────────────────────────

// Detect faces in a single image
const faces = await NitroFace.detect(imageUri, {
  performanceMode: "accurate",
  landmarks: true,
  classifications: true,
});

// Detect the primary face (selfie optimization)
const face = await NitroFace.detectPrimary(selfieUri);

// Crop all faces from an image (returns temp file URIs)
const crops = await NitroFace.cropFaces(photoUri, { padding: 0.3 });

// ─── Recognition (MobileFaceNet, Apache 2.0) ────────────────

// Register a player: selfie → embedding (one native call)
const marcosEmbedding = await NitroFace.extractPrimaryEmbedding(selfieUri);
// → [0.12, -0.34, 0.56, ...] (128-d vector)

// Compare two faces
const similarity = NitroFace.compareFaces(marcosEmbedding, otherEmbedding);
// → 0.87 (87% match = same person)

// ─── Batch (the killer feature) ─────────────────────────────

// Scan 500 gallery photos: detect + embed ALL faces, one bridge call
const results = await NitroFace.detectAndEmbed(galleryUris, {
  performanceMode: "fast",
  concurrency: 4,
});

// Find Marcos in all photos
for (const result of results) {
  for (const face of result.faces) {
    const sim = NitroFace.compareFaces(marcosEmbedding, face.embedding);
    if (sim > 0.7) {
      console.log(`Found Marcos in photo ${result.index}!`);
    }
  }
}
```

## Batch Processing

The killer feature. Instead of 500 bridge roundtrips:

```
// ❌ Old way: 500 bridge crossings
for (const uri of photos) {
  const faces = await oldDetector.detect(uri); // bridge → native → bridge
}

// ✅ Nitro way: 1 bridge crossing
const results = await NitroFace.detectBatch(photos, { concurrency: 4 });
```

## Platforms

- ✅ iOS 17+ (ML Kit via CocoaPods)
- ✅ Android 13+ (ML Kit bundled)
- 🔜 tvOS (Vision framework)
- 🔜 macOS (Vision framework)

## License

MIT
