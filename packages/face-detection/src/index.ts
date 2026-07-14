export { type FaceDetector } from "./specs/FaceDetector.nitro";
export { PerformanceMode, FaceLandmarkType } from "./specs/FaceDetector.nitro";
export type {
  BatchCropResult,
  BatchEmbeddingResult,
  CroppedFace,
  DetectedFace,
  DetectedFaceWithEmbedding,
  FaceBounds,
  FaceDetectionOptions,
  FaceLandmark,
} from "./specs/FaceDetector.nitro";

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NitroModules } from "react-native-nitro-modules";
import type { FaceDetector } from "./specs/FaceDetector.nitro";

if (Platform.OS === "android") {
  // Expo modules load lazily on Android — force ours to instantiate now so
  // NitroMLKitFacePackage's init block loads libNitroMLKitFace.so and
  // registers the FaceDetector HybridObject before it's requested below.
  requireOptionalNativeModule("NitroMLKitFace");
}

/**
 * Get the shared FaceDetector instance.
 * The HybridObject is created once and reused.
 */
export const NitroFace =
  NitroModules.createHybridObject<FaceDetector>("FaceDetector");
