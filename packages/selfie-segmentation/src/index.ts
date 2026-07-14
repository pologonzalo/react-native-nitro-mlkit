export { type SelfieSegmenter } from "./specs/SelfieSegmenter.nitro";
export type {
  BatchSegmentationResult,
  SegmentationResult,
} from "./specs/SelfieSegmenter.nitro";

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NitroModules } from "react-native-nitro-modules";
import type { SelfieSegmenter } from "./specs/SelfieSegmenter.nitro";

if (Platform.OS === "android") {
  requireOptionalNativeModule("NitroMLKitSelfieSeg");
}

/** Get the shared SelfieSegmenter instance. */
export const NitroSelfieSegmenter =
  NitroModules.createHybridObject<SelfieSegmenter>("SelfieSegmenter");
