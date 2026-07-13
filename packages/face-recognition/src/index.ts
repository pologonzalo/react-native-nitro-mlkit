export { type FaceRecognizer } from "./specs/FaceRecognizer.nitro";
export type {
  FaceEmbedding,
  FaceSearchResult,
  PhotoPersonResult,
  RegisteredPerson,
} from "./specs/FaceRecognizer.nitro";

import { NitroModules } from "react-native-nitro-modules";
import type { FaceRecognizer } from "./specs/FaceRecognizer.nitro";

/**
 * Get the shared FaceRecognizer instance.
 *
 * Example usage for a party game:
 * ```typescript
 * // 1. Each player registers with a selfie
 * await NitroRecognizer.registerPerson("marcos", "Marcos", selfieUri);
 * await NitroRecognizer.registerPerson("lucia", "Lucía", selfieUri2);
 *
 * // 2. Scan everyone's galleries (500 photos, 1 bridge call)
 * const results = await NitroRecognizer.findPeopleInPhotos(allPhotoUris, {
 *   concurrency: 4,
 *   minSimilarity: 0.7,
 * });
 *
 * // 3. Use results for the game
 * const marcosPhotos = results.filter(r =>
 *   r.people.some(p => p.person.id === "marcos")
 * );
 * // → "¿De quién es esta foto?" → Marcos sale en ella
 *
 * // 4. End of game — clear registry
 * NitroRecognizer.clearRegistry();
 * ```
 */
export const NitroRecognizer =
  NitroModules.createHybridObject<FaceRecognizer>("FaceRecognizer");
