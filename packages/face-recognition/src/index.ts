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

const UNSUPPORTED =
  "@nitro-mlkit/face-recognition runs on Android and iOS only.";

let instance: FaceRecognizer | undefined;

function getInstance(): FaceRecognizer {
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    throw new Error(UNSUPPORTED);
  }
  if (!instance) {
    if (Platform.OS === "android") {
      // Force the Expo module to instantiate so libNitroMLKitRecognition.so
      // loads and registers the FaceRecognizer HybridObject before it's
      // requested. iOS links statically — nothing to force there.
      requireOptionalNativeModule("NitroMLKitRecognition");
    }
    instance = NitroModules.createHybridObject<FaceRecognizer>("FaceRecognizer");
  }
  return instance;
}

/**
 * The shared FaceRecognizer instance (Android + iOS).
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
 * `isSupported()` returns false off Android/iOS; every other member throws
 * there. On the iOS *Simulator* recognition methods throw at call time (Google
 * ML Kit ships no arm64 Simulator slice) — run on a physical device.
 * Accessed lazily through a Proxy so merely importing this module never
 * crashes — only *calling* a method on an unsupported platform throws.
 */
export const NitroRecognizer: FaceRecognizer & { isSupported(): boolean } =
  new Proxy({} as FaceRecognizer & { isSupported(): boolean }, {
    get(_target, prop) {
      if (prop === "isSupported") {
        return () => Platform.OS === "android" || Platform.OS === "ios";
      }
      const inst = getInstance() as unknown as Record<string | symbol, unknown>;
      const value = inst[prop];
      return typeof value === "function" ? value.bind(inst) : value;
    },
  });
