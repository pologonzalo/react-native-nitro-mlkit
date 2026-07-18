export { type Translator } from "./specs/Translator.nitro";

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NitroModules } from "react-native-nitro-modules";
import type { Translator } from "./specs/Translator.nitro";

if (Platform.OS === "android") {
  requireOptionalNativeModule("NitroMLKitTranslate");
}

/** Get the shared Translator instance. */
export const NitroTranslate =
  NitroModules.createHybridObject<Translator>("Translator");
