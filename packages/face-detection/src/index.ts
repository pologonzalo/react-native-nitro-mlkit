export { type FaceDetector } from "./specs/FaceDetector.nitro";
export type {
  BatchCropResult,
  BatchDetectionResult,
  BatchEmbeddingResult,
  BatchOptions,
  CroppedFace,
  DetectedFace,
  DetectedFaceWithEmbedding,
  FaceBounds,
  FaceDetectionOptions,
  FaceLandmark,
  FaceLandmarkType,
} from "./specs/FaceDetector.nitro";

import { NitroModules } from "react-native-nitro-modules";
import type { FaceDetector } from "./specs/FaceDetector.nitro";

/**
 * Get the shared FaceDetector instance.
 * The HybridObject is created once and reused.
 */
export const NitroFace =
  NitroModules.createHybridObject<FaceDetector>("FaceDetector");
