export { type ObjectDetector } from "./specs/ObjectDetector.nitro";
export type {
  BatchObjectResult,
  DetectedObject,
  ObjectLabel,
  ObjectRect,
} from "./specs/ObjectDetector.nitro";

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NitroModules } from "react-native-nitro-modules";
import type { ObjectDetector } from "./specs/ObjectDetector.nitro";

if (Platform.OS === "android") {
  requireOptionalNativeModule("NitroMLKitObjects");
}

/** Get the shared ObjectDetector instance. */
export const NitroObjects =
  NitroModules.createHybridObject<ObjectDetector>("ObjectDetector");
