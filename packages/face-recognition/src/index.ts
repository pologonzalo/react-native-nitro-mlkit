export { type FaceRecognizer } from "./specs/FaceRecognizer.nitro";
export type {
  FaceEmbedding,
  FaceSearchResult,
  FindPeopleOptions,
  PhotoPersonResult,
  RegisteredPerson,
} from "./specs/FaceRecognizer.nitro";

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NitroModules } from "react-native-nitro-modules";
import type { FaceRecognizer } from "./specs/FaceRecognizer.nitro";

const ANDROID_ONLY =
  "@nitro-mlkit/face-recognition is Android-only for now — the iOS TensorFlow Lite embedding path is not implemented yet (planned for v0.2).";

let instance: FaceRecognizer | undefined;

function getInstance(): FaceRecognizer {
  if (Platform.OS !== "android") throw new Error(ANDROID_ONLY);
  if (!instance) {
    // Force the Expo module to instantiate so libNitroMLKitRecognition.so loads
    // and registers the FaceRecognizer HybridObject before it's requested.
    requireOptionalNativeModule("NitroMLKitRecognition");
    instance = NitroModules.createHybridObject<FaceRecognizer>("FaceRecognizer");
  }
  return instance;
}

/**
 * The shared FaceRecognizer instance (Android-only for now).
 *
 * Recognition needs a face-embedding model (ML Kit only does detection).
 * Provide one once via `downloadModel(url)` (cached on disk) or `loadModel(uri)`.
 *
 * Party-game flow:
 * ```ts
 * await NitroRecognizer.downloadModel("https://…/mobilefacenet.tflite"); // once
 * await NitroRecognizer.registerPerson("marcos", "Marcos", selfieUri);
 * const results = await NitroRecognizer.findPeopleInPhotos(galleryUris, {
 *   concurrency: 4, minSimilarity: 0.7,
 * });
 * NitroRecognizer.clearRegistry(); // end of game
 * ```
 *
 * `isSupported()` returns false off Android; every other member throws there.
 * Accessed lazily through a Proxy so merely importing this module never crashes
 * on iOS — only *calling* a method off-Android throws.
 */
export const NitroRecognizer: FaceRecognizer & { isSupported(): boolean } =
  new Proxy({} as FaceRecognizer & { isSupported(): boolean }, {
    get(_target, prop) {
      if (prop === "isSupported") {
        return () => Platform.OS === "android";
      }
      const inst = getInstance() as unknown as Record<string | symbol, unknown>;
      const value = inst[prop];
      return typeof value === "function" ? value.bind(inst) : value;
    },
  });
