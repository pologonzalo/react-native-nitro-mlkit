export { type TextRecognizer } from "./specs/TextRecognizer.nitro";
export type {
  BatchTextResult,
  RecognizedText,
  TextBlock,
  TextElement,
  TextLine,
  TextRect,
} from "./specs/TextRecognizer.nitro";

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NitroModules } from "react-native-nitro-modules";
import type { TextRecognizer } from "./specs/TextRecognizer.nitro";

if (Platform.OS === "android") {
  // Expo modules load lazily on Android — force ours to instantiate now so
  // NitroMLKitTextPackage's init block loads libNitroMLKitText.so and registers
  // the TextRecognizer HybridObject before it's requested below.
  requireOptionalNativeModule("NitroMLKitText");
}

/**
 * Get the shared TextRecognizer instance.
 * The HybridObject is created once and reused.
 */
export const NitroText =
  NitroModules.createHybridObject<TextRecognizer>("TextRecognizer");
