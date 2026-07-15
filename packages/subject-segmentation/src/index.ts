export { type SubjectSegmenter } from "./specs/SubjectSegmenter.nitro";
export type { SubjectSegmentationResult } from "./specs/SubjectSegmenter.nitro";

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NitroModules } from "react-native-nitro-modules";
import type {
  SubjectSegmentationResult,
  SubjectSegmenter,
} from "./specs/SubjectSegmenter.nitro";

const ANDROID_ONLY =
  "@nitro-mlkit/subject-segmentation is Android-only — Google ML Kit does not provide a Subject Segmentation API on iOS.";

let instance: SubjectSegmenter | undefined;

function getInstance(): SubjectSegmenter {
  if (Platform.OS !== "android") throw new Error(ANDROID_ONLY);
  if (!instance) {
    requireOptionalNativeModule("NitroMLKitSubjectSeg");
    instance =
      NitroModules.createHybridObject<SubjectSegmenter>("SubjectSegmenter");
  }
  return instance;
}

/**
 * The shared SubjectSegmenter. Android-only: `isAvailable()` returns false on
 * other platforms, and `segment()` rejects there.
 */
export const NitroSubjectSegmenter = {
  segment(imageUri: string): Promise<SubjectSegmentationResult> {
    return getInstance().segment(imageUri);
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
