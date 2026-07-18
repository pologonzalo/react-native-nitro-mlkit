import type { HybridObject } from "react-native-nitro-modules";

export interface SubjectSegmentationResult {
  /** file:// uri of a PNG cutout of the foreground subject(s) (transparent bg). */
  foregroundUri: string;
  width: number;
  height: number;
  /** Number of distinct subjects found. */
  subjectCount: number;
}

/**
 * On-device subject segmentation powered by Google ML Kit. Cuts out the main
 * subject(s) of a photo from the background, returning a transparent PNG.
 * Downloads a model at runtime on first use. Android-only.
 */
export interface SubjectSegmenter extends HybridObject<{ android: "kotlin" }> {
  segment(imageUri: string): Promise<SubjectSegmentationResult>;
  isAvailable(): boolean;
}
