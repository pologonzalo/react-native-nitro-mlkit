import type { HybridObject } from "react-native-nitro-modules";

/**
 * A single image label detected by MLKit.
 */
export interface ImageLabel {
  /** Label text (e.g. "beach", "dog", "food", "party") */
  text: string;
  /** Confidence score (0..1) */
  confidence: number;
  /** MLKit internal index */
  index: number;
}

/**
 * Options for image labeling.
 */
export interface LabelingOptions {
  /** Minimum confidence threshold (0..1). Default: 0.5 */
  confidenceThreshold?: number;
  /** Max number of labels to return per image. Default: 10 */
  maxLabels?: number;
}

/**
 * Result of batch labeling.
 */
export interface BatchLabelResult {
  /** Index in the input array */
  index: number;
  /** Detected labels for this image */
  labels: ImageLabel[];
  success: boolean;
  error?: string;
}

/**
 * NSFW detection result.
 */
export interface SafetyResult {
  /** Is the image safe to show? */
  safe: boolean;
  /** Labels that triggered the unsafe flag */
  unsafeLabels: string[];
  /** Overall safety confidence (0..1, higher = safer) */
  safetyScore: number;
}

/**
 * Batch options for labeling.
 */
export interface BatchLabelOptions extends LabelingOptions {
  /** Max concurrent native operations (default: 4) */
  concurrency?: number;
  /** Also run safety check on each image */
  checkSafety?: boolean;
}

/**
 * The main Image Labeler Nitro HybridObject.
 *
 * Uses MLKit Image Labeling (on-device, free, 400+ labels).
 * No custom models needed — Google maintains and updates the labels.
 */
export interface ImageLabeler extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  /**
   * Label a single image.
   *
   * @param imageUri - Local file URI
   * @param options - Labeling options
   * @returns Array of detected labels, sorted by confidence
   */
  label(imageUri: string, options?: LabelingOptions): Promise<ImageLabel[]>;

  /**
   * Label multiple images in parallel (one bridge call).
   * The killer feature for gallery scanning.
   */
  labelBatch(
    imageUris: string[],
    options?: BatchLabelOptions,
  ): Promise<BatchLabelResult[]>;

  /**
   * Check if an image contains potentially unsafe/NSFW content.
   * Uses MLKit labels to detect nudity, violence, etc.
   */
  checkSafety(imageUri: string): Promise<SafetyResult>;

  /**
   * Batch safety check — filter a gallery in one native call.
   */
  checkSafetyBatch(
    imageUris: string[],
    options?: { concurrency?: number },
  ): Promise<SafetyResult[]>;

  /**
   * Get labels that match specific categories.
   * Useful for filtering photos by theme (e.g. "give me all beach photos").
   *
   * @param imageUri - Image to label
   * @param categories - Categories to check (e.g. ["beach", "mountain", "pet"])
   * @returns Only labels that match the requested categories
   */
  matchCategories(
    imageUri: string,
    categories: string[],
  ): Promise<ImageLabel[]>;

  /**
   * Check if labeling is available on this device.
   */
  isAvailable(): boolean;
}
