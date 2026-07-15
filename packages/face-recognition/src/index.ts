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

if (Platform.OS === "android") {
  requireOptionalNativeModule("NitroMLKitRecognition");
}

/**
 * The shared FaceRecognizer instance.
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
 */
export const NitroRecognizer =
  NitroModules.createHybridObject<FaceRecognizer>("FaceRecognizer");
