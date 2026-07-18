import type { HybridObject } from "react-native-nitro-modules";

/**
 * A bounding box in image pixel coordinates.
 */
export interface TextRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A single recognized word / element.
 */
export interface TextElement {
  text: string;
  bounds: TextRect;
}

/**
 * A recognized line of text (a run of elements on one baseline).
 */
export interface TextLine {
  text: string;
  bounds: TextRect;
  elements: TextElement[];
}

/**
 * A recognized block of text (a paragraph-ish group of lines).
 */
export interface TextBlock {
  text: string;
  bounds: TextRect;
  lines: TextLine[];
}

/**
 * Full structured OCR result for one image.
 */
export interface RecognizedText {
  /** The entire recognized text, blocks joined by newlines. */
  text: string;
  /** Structured blocks -> lines -> elements. */
  blocks: TextBlock[];
}

/**
 * Result of recognizing text in one image within a batch.
 */
export interface BatchTextResult {
  index: number;
  text: RecognizedText;
  success: boolean;
  error?: string;
}

/**
 * On-device text recognition (OCR) powered by MLKit (Latin script).
 * Returns the full text plus a structured block/line/element hierarchy with
 * bounding boxes — all on-device, zero bridge overhead via Nitro.
 */
export interface TextRecognizer extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  /**
   * Recognize text in an image, returning the full structured result.
   */
  recognize(imageUri: string): Promise<RecognizedText>;

  /**
   * Recognize text and return just the flat string (convenience).
   */
  recognizeText(imageUri: string): Promise<string>;

  /**
   * Recognize text across many images in parallel (one native call).
   */
  recognizeBatch(
    imageUris: string[],
    concurrency: number,
  ): Promise<BatchTextResult[]>;

  /**
   * Whether text recognition is available on this device.
   */
  isAvailable(): boolean;
}
