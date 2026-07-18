export { type EntityExtractor } from "./specs/EntityExtractor.nitro";
export type { DetectedEntity } from "./specs/EntityExtractor.nitro";

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NitroModules } from "react-native-nitro-modules";
import type {
  DetectedEntity,
  EntityExtractor,
} from "./specs/EntityExtractor.nitro";

const ANDROID_ONLY =
  "@nitro-mlkit/entity-extraction is Android-only — Google ML Kit does not provide an Entity Extraction API on iOS.";

let instance: EntityExtractor | undefined;

function getInstance(): EntityExtractor {
  if (Platform.OS !== "android") throw new Error(ANDROID_ONLY);
  if (!instance) {
    requireOptionalNativeModule("NitroMLKitEntity");
    instance =
      NitroModules.createHybridObject<EntityExtractor>("EntityExtractor");
  }
  return instance;
}

/**
 * The shared EntityExtractor. Android-only: `isAvailable()` returns false
 * on other platforms, and `annotate()` rejects there.
 */
export const NitroEntityExtraction = {
  annotate(text: string): Promise<DetectedEntity[]> {
    return getInstance().annotate(text);
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
