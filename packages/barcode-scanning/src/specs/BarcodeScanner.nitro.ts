import type { HybridObject } from "react-native-nitro-modules";

/**
 * Bounding box of a detected barcode, in image pixel coordinates.
 */
export interface BarcodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A single barcode / QR code detected in an image.
 */
export interface Barcode {
  /** Raw encoded content, exactly as stored in the barcode. */
  rawValue: string;
  /** Human-readable value (may differ from rawValue for structured types). */
  displayValue: string;
  /** Symbology, e.g. "QR_CODE", "EAN_13", "CODE_128", "PDF417", "AZTEC". */
  format: string;
  /** Semantic content type, e.g. "URL", "TEXT", "WIFI", "PHONE", "CONTACT_INFO". */
  valueType: string;
  /** Bounding box in image pixel coordinates. */
  bounds: BarcodeBounds;
}

/**
 * Result of scanning one image in a batch.
 */
export interface BatchScanResult {
  /** Index in the input array. */
  index: number;
  /** Barcodes detected in this image. */
  barcodes: Barcode[];
  success: boolean;
  error?: string;
}

/**
 * On-device barcode & QR scanning powered by MLKit.
 * Detects all common 1D and 2D symbologies from a still image — no network,
 * zero bridge overhead via Nitro.
 */
export interface BarcodeScanner extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  /**
   * Scan an image for every barcode / QR code it contains.
   */
  scan(imageUri: string): Promise<Barcode[]>;

  /**
   * Scan multiple images in parallel (one native call, native concurrency).
   */
  scanBatch(imageUris: string[], concurrency: number): Promise<BatchScanResult[]>;

  /**
   * Scan and return only the first barcode found (or undefined if none).
   */
  scanFirst(imageUri: string): Promise<Barcode | undefined>;

  /**
   * Whether barcode scanning is available on this device.
   */
  isAvailable(): boolean;
}
