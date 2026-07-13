export { type FaceDetector } from "./specs/FaceDetector.nitro";
export type {
  DetectedFace,
  DetectedFaceWithEmbedding,
  FaceBounds,
  FaceLandmark,
  FaceLandmarkType,
  FaceDetectionOptions,
  BatchDetectionResult,
  BatchOptions,
  BatchCropResult,
  BatchEmbeddingResult,
  CroppedFace,
} from "./specs/FaceDetector.nitro";

import { NitroModules } from "react-native-nitro-modules";
import type { FaceDetector } from "./specs/FaceDetector.nitro";

/**
 * Get the shared FaceDetector instance.
 * The HybridObject is created once and reused.
 */
export const NitroFace =
  NitroModules.createHybridObject<FaceDetector>("FaceDetector");
