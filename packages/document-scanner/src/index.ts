export { type DocumentScanner } from "./specs/DocumentScanner.nitro";
export type { ScannedDocument } from "./specs/DocumentScanner.nitro";

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NitroModules } from "react-native-nitro-modules";
import type {
  DocumentScanner,
  ScannedDocument,
} from "./specs/DocumentScanner.nitro";

const ANDROID_ONLY =
  "@nitro-mlkit/document-scanner is Android-only — Google ML Kit provides the Document Scanner on Android only.";

let instance: DocumentScanner | undefined;

function getInstance(): DocumentScanner {
  if (Platform.OS !== "android") throw new Error(ANDROID_ONLY);
  if (!instance) {
    requireOptionalNativeModule("NitroMLKitDocumentScanner");
    instance =
      NitroModules.createHybridObject<DocumentScanner>("DocumentScanner");
  }
  return instance;
}

/**
 * The shared DocumentScanner. Android-only: `isAvailable()` returns false on
 * other platforms and `scan()` rejects there.
 */
export const NitroDocumentScanner = {
  scan(
    pageLimit: number,
    includePdf: boolean,
    allowGalleryImport: boolean,
  ): Promise<ScannedDocument> {
    return getInstance().scan(pageLimit, includePdf, allowGalleryImport);
  },
  isAvailable(): boolean {
    if (Platform.OS !== "android") return false;
    try {
      return getInstance().isAvailable();
    } catch {
      return false;
    }
  },
};
