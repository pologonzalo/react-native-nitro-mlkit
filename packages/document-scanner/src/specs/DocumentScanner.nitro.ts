import type { HybridObject } from "react-native-nitro-modules";

/** The result of a document scan. */
export interface ScannedDocument {
  /** File URIs of the scanned pages as JPEGs, in order. */
  pageImageUris: string[];
  /** File URI of the combined PDF, if `includePdf` was requested. */
  pdfUri?: string;
  /** Number of scanned pages. */
  pageCount: number;
}

/**
 * On-device document scanner powered by Google ML Kit (Google Play services).
 * Unlike the other packages this is **not** a still-image API — `scan()`
 * launches ML Kit's full-screen scanner UI (edge detection, perspective
 * correction, filters, multi-page) and resolves with the captured pages.
 *
 * Android-only: ML Kit provides the Document Scanner on Android only.
 */
export interface DocumentScanner extends HybridObject<{
  android: "kotlin";
}> {
  /**
   * Launch the scanner UI. Resolves with the scanned pages when the user
   * finishes, or rejects if they cancel or scanning fails.
   *
   * @param pageLimit max pages the user may scan (>= 1).
   * @param includePdf also produce a combined PDF (`pdfUri` in the result).
   * @param allowGalleryImport let the user import an existing image too.
   */
  scan(
    pageLimit: number,
    includePdf: boolean,
    allowGalleryImport: boolean,
  ): Promise<ScannedDocument>;

  isAvailable(): boolean;
}
