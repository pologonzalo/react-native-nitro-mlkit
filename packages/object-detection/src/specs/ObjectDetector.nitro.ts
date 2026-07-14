import type { HybridObject } from "react-native-nitro-modules";

/** Bounding box in image pixel coordinates. */
export interface ObjectRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A classification label for a detected object. */
export interface ObjectLabel {
  text: string;
  confidence: number;
  index: number;
}

/** A single detected (and optionally tracked + classified) object. */
export interface DetectedObject {
  bounds: ObjectRect;
  /** Tracking id across frames, or -1 if tracking is off / unavailable. */
  trackingId: number;
  labels: ObjectLabel[];
}

/** Result of detecting objects in one image within a batch. */
export interface BatchObjectResult {
  index: number;
  objects: DetectedObject[];
  success: boolean;
  error?: string;
}

/**
 * On-device object detection & classification powered by MLKit.
 * Detects multiple objects in a still image with bounding boxes and coarse
 * category labels — all on-device, zero bridge overhead via Nitro.
 */
export interface ObjectDetector extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  /** Detect all objects in an image. */
  detect(imageUri: string): Promise<DetectedObject[]>;

  /** Detect objects across many images in parallel (one native call). */
  detectBatch(
    imageUris: string[],
    concurrency: number,
  ): Promise<BatchObjectResult[]>;

  /** Whether object detection is available on this device. */
  isAvailable(): boolean;
}
