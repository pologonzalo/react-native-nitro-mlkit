export { type LanguageIdentifier } from "./specs/LanguageIdentifier.nitro";
export type { LanguageMatch } from "./specs/LanguageIdentifier.nitro";

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NitroModules } from "react-native-nitro-modules";
import type { LanguageIdentifier } from "./specs/LanguageIdentifier.nitro";

if (Platform.OS === "android") {
  requireOptionalNativeModule("NitroMLKitLangId");
}

/** Get the shared LanguageIdentifier instance. */
export const NitroLanguageId =
  NitroModules.createHybridObject<LanguageIdentifier>("LanguageIdentifier");
