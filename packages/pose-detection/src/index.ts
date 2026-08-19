export { type PoseDetector } from "./specs/PoseDetector.nitro";
export {
  PerformanceMode,
  DetectorMode,
} from "./specs/PoseDetector.nitro";
export type {
  BatchPoseResult,
  PoseDetectionOptions,
  PoseLandmark,
} from "./specs/PoseDetector.nitro";
export {
  PoseLandmarkType,
  getLandmark,
  landmarkAngle,
  type PoseLandmarkTypeName,
} from "./poseUtils";

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";
import { NitroModules } from "react-native-nitro-modules";
import type { PoseDetector } from "./specs/PoseDetector.nitro";

if (Platform.OS === "android") {
  requireOptionalNativeModule("NitroMLKitPose");
}

/** Get the shared PoseDetector instance. */
export const NitroPose =
  NitroModules.createHybridObject<PoseDetector>("PoseDetector");
