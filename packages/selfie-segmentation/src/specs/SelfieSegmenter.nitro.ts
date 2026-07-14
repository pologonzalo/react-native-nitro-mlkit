import type { HybridObject } from "react-native-nitro-modules";

/**
 * The result of segmenting a selfie: a foreground/background mask.
 */
export interface SegmentationResult {
  /**
   * A PNG written to a temp file whose alpha channel encodes the per-pixel
   * foreground confidence (white where the person is, transparent elsewhere).
   */
  maskUri: string;
  /** Mask width in pixels. */
  width: number;
  /** Mask height in pixels. */
  height: number;
  /** Fraction of pixels classified as foreground (confidence > 0.5). */
  foregroundRatio: number;
}

/**
 * Result of segmenting one image within a batch.
 */
export interface BatchSegmentationResult {
  index: number;
  result: SegmentationResult;
  success: boolean;
  error?: string;
}

/**
 * On-device selfie segmentation powered by MLKit.
 * Separates the person (foreground) from the background in a still image and
 * returns a confidence mask as a PNG — all on-device via Nitro.
 */
export interface SelfieSegmenter extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  /** Segment a selfie; returns a mask PNG + foreground ratio. */
  segment(imageUri: string): Promise<SegmentationResult>;

  /** Segment many images in parallel (one native call). */
  segmentBatch(
    imageUris: string[],
    concurrency: number,
  ): Promise<BatchSegmentationResult[]>;

  /** Whether selfie segmentation is available on this device. */
  isAvailable(): boolean;
}
