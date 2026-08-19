import type { HybridObject } from "react-native-nitro-modules";

// ─── Enums (Nitrogen requires explicit enums, not string unions) ────────────

export enum PerformanceMode {
  /** Base BlazePose model (~10 MB) — the default. */
  FAST = 0,
  /**
   * Accurate BlazePose model. Better landmark precision at higher latency and
   * a bigger binary: the accurate model ships alongside the base one, both are
   * always bundled (see the README's size note).
   */
  ACCURATE = 1,
}

export enum DetectorMode {
  /** Every image is independent — the right mode for photos. Default. */
  SINGLE_IMAGE = 0,
  /**
   * Consecutive frames of the same scene (video / camera): the detector uses
   * the previous frame's result to track instead of re-detecting, which is
   * faster and less jittery — but wrong for unrelated photos.
   */
  STREAM = 1,
}

/**
 * A single skeletal landmark (one of 33 body points).
 */
export interface PoseLandmark {
  /** ML Kit landmark type index (0..32, e.g. 0 = nose, 11 = left shoulder). */
  type: number;
  x: number;
  y: number;
  /**
   * Depth relative to the body's hip midpoint, in roughly the same scale as
   * x/y. Negative = toward the camera. Useful for left/right disambiguation
   * and 3D-ish effects; don't treat it as metric depth.
   */
  z: number;
  /** Likelihood the landmark is within the frame (0..1). */
  inFrameLikelihood: number;
}

/**
 * Detector configuration. Omit (or omit fields) for the defaults:
 * FAST + SINGLE_IMAGE — what previous versions always used.
 */
export interface PoseDetectionOptions {
  performanceMode?: PerformanceMode;
  detectorMode?: DetectorMode;
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
 *
 * ML Kit Pose only ever reports ONE body per image (the most prominent).
 * Multi-person detection is an upstream limitation, not a missing feature here.
 */
export interface PoseDetector extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  /** Detect the primary pose in an image; returns its landmarks. */
  detect(
    imageUri: string,
    options?: PoseDetectionOptions,
  ): Promise<PoseLandmark[]>;

  /** Detect poses across many images in parallel (one native call). */
  detectBatch(
    imageUris: string[],
    concurrency: number,
    options?: PoseDetectionOptions,
  ): Promise<BatchPoseResult[]>;

  /** Whether pose detection is available on this device. */
  isAvailable(): boolean;
}
