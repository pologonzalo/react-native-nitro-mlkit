export { type BarcodeScanner } from "./specs/BarcodeScanner.nitro";
export type {
  Barcode,
  BarcodeBounds,
  BatchScanResult,
} from "./specs/BarcodeScanner.nitro";

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NitroModules } from "react-native-nitro-modules";
import type { BarcodeScanner } from "./specs/BarcodeScanner.nitro";

if (Platform.OS === "android") {
  // Expo modules load lazily on Android — force ours to instantiate now so
  // NitroMLKitBarcodePackage's init block loads libNitroMLKitBarcode.so and
  // registers the BarcodeScanner HybridObject before it's requested below.
  requireOptionalNativeModule("NitroMLKitBarcode");
}

/**
 * Get the shared BarcodeScanner instance.
 * The HybridObject is created once and reused.
 */
export const NitroBarcode =
  NitroModules.createHybridObject<BarcodeScanner>("BarcodeScanner");
