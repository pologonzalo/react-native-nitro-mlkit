import type { HybridObject } from "react-native-nitro-modules";

/**
 * A single skeletal landmark (one of 33 body points).
 */
export interface PoseLandmark {
  /** ML Kit landmark type index (0..32, e.g. 0 = nose, 11 = left shoulder). */
  type: number;
  x: number;
  y: number;
  z: number;
  /** Likelihood the landmark is within the frame (0..1). */
  inFrameLikelihood: number;
}

/**
 * Result of detecting a pose in one image within a batch.
 */
export interface BatchPoseResult {
  index: number;
  /** Detected landmarks (empty if no pose was found). */
  landmarks: PoseLandmark[];
  success: boolean;
  error?: string;
}

/**
 * On-device pose detection powered by MLKit.
 * Returns 33 skeletal landmarks (with 3D position + in-frame likelihood) for
 * the primary body in a still image — all on-device via Nitro.
 */
export interface PoseDetector extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  /** Detect the primary pose in an image; returns its landmarks. */
  detect(imageUri: string): Promise<PoseLandmark[]>;

  /** Detect poses across many images in parallel (one native call). */
  detectBatch(
    imageUris: string[],
    concurrency: number,
  ): Promise<BatchPoseResult[]>;

  /** Whether pose detection is available on this device. */
  isAvailable(): boolean;
}
