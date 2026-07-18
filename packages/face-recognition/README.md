# React Native ML Kit — Face Recognition

**`@nitro-mlkit/face-recognition`** · on-device Google ML Kit via [Nitro Modules](https://github.com/mrousavy/nitro) — JSI, no bridge.

> ⚠️ **Beta (`0.1.0-beta.x`).** Android verified on-device; iOS impl pending
> (see [Platform status](#platform-status)). **You provide the embedding model.**

On-device **face recognition** for React Native, built with
[Nitro Modules](https://github.com/mrousavy/nitro) (JSI, no bridge).

**Google ML Kit** finds & crops faces; a **TensorFlow Lite face-embedding model**
(you supply it — e.g. MobileFaceNet, ~5 MB) turns each face into a vector, and
cosine similarity against an in-memory **registry** answers *"who is this?"*.
Built for flows like a party game: register players by selfie, then scan a
gallery to find which photos each player appears in.

> **Why bring your own model?** ML Kit only does face *detection*, not
> recognition/embeddings. Face-embedding models vary in size/quality/license, so
> this package ships none (keeping it tiny) and loads one at runtime. Input and
> output tensor shapes are read from your model, so 112×112 / 128-d / 192-d
> MobileFaceNet variants all work.

## Installation

```bash
npm install @nitro-mlkit/face-recognition react-native-nitro-modules
```

No config plugin (autolinked Expo module). Install and `npx expo prebuild`.
Not available in Expo Go.

## Usage

```ts
import { NitroRecognizer } from "@nitro-mlkit/face-recognition";

// 1. Provide a face-embedding model once (cached on disk).
await NitroRecognizer.downloadModel("https://your-host/mobilefacenet.tflite");
// …or load one you've bundled / downloaded yourself:
// await NitroRecognizer.loadModel("file:///…/mobilefacenet.tflite");

// 2. Register people (e.g. from selfies).
await NitroRecognizer.registerPerson("marcos", "Marcos", selfieUri);
await NitroRecognizer.registerPerson("lucia", "Lucía", selfieUri2);
await NitroRecognizer.addReference("marcos", anotherMarcosPhoto); // improves accuracy

// 3. Scan photos — one native batch call.
const results = await NitroRecognizer.findPeopleInPhotos(galleryUris, {
  concurrency: 4,
  minSimilarity: 0.6,
});
const marcosPhotos = results.filter((r) =>
  r.people.some((p) => p.person.id === "marcos"),
);

// Lower-level:
const emb = await NitroRecognizer.extractEmbedding(faceUri); // { vector: number[] }
const sim = NitroRecognizer.compare(embA, embB);             // cosine, 0..1

NitroRecognizer.clearRegistry(); // e.g. end of game session
```

### Choosing a model

Any TFLite face-embedding model that takes an RGB face crop and outputs a
fixed-length vector works (pixels are normalised as `(px − 127.5) / 128`).
**MobileFaceNet** (Apache-2.0, ~5 MB, 112×112 → 192-d) is a good default. Host it
yourself (e.g. a GitHub release asset or your CDN) and pass the URL to
`downloadModel()`. A curated `FaceModel` enum of self-hosted, license-clear
models is planned for a later release.

## Platform status

| Platform | Min | Status |
| -------- | --- | ------ |
| Android  | API 26+ | ✅ Verified on-device (Pixel 9, API 36): register + find + compare |
| iOS      | 15.5+   | 🔨 Swift impl pending (GoogleMLKit + TensorFlowLite) |

## Part of `nitro-mlkit`

The full ML Kit suite on Nitro — see the other `@nitro-mlkit/*` packages.

## License

MIT © Gonzalo Polo · (bring-your-own model keeps its own license)
