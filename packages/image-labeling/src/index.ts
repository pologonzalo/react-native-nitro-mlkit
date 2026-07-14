export { type ImageLabeler } from "./specs/ImageLabeler.nitro";
export type {
  BatchLabelOptions,
  BatchLabelResult,
  BatchSafetyOptions,
  ImageLabel,
  LabelingOptions,
  SafetyResult,
} from "./specs/ImageLabeler.nitro";

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NitroModules } from "react-native-nitro-modules";
import type { ImageLabeler } from "./specs/ImageLabeler.nitro";

if (Platform.OS === "android") {
  // Expo modules load lazily on Android — force ours to instantiate now so
  // NitroMLKitLabelingPackage's init block loads libNitroMLKitLabeling.so and
  // registers the ImageLabeler HybridObject before it's requested below.
  requireOptionalNativeModule("NitroMLKitLabeling");
}

/**
 * Get the shared ImageLabeler instance.
 * The HybridObject is created once and reused.
 */
export const NitroLabeler =
  NitroModules.createHybridObject<ImageLabeler>("ImageLabeler");
