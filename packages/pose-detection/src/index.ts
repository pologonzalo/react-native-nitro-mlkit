export { type PoseDetector } from "./specs/PoseDetector.nitro";
export type {
  BatchPoseResult,
  PoseLandmark,
} from "./specs/PoseDetector.nitro";

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NitroModules } from "react-native-nitro-modules";
import type { PoseDetector } from "./specs/PoseDetector.nitro";

if (Platform.OS === "android") {
  requireOptionalNativeModule("NitroMLKitPose");
}

/** Get the shared PoseDetector instance. */
export const NitroPose =
  NitroModules.createHybridObject<PoseDetector>("PoseDetector");
