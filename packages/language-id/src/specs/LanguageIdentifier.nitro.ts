import type { HybridObject } from "react-native-nitro-modules";

/**
 * A candidate language with its confidence.
 */
export interface LanguageMatch {
  /** BCP-47 language tag, e.g. "en", "es", "und" (undetermined). */
  language: string;
  confidence: number;
}

/**
 * On-device language identification powered by MLKit.
 * Detects the (most likely) language of a piece of text — no network, zero
 * bridge overhead via Nitro. Operates on text, so there are no images involved.
 */
export interface LanguageIdentifier extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  /**
   * Identify the most likely language of the text.
   * Returns a BCP-47 tag, or "und" if undetermined.
   */
  identify(text: string): Promise<string>;

  /**
   * Identify all possible languages above the confidence threshold,
   * sorted by confidence descending.
   */
  identifyPossible(text: string): Promise<LanguageMatch[]>;

  /** Whether language identification is available on this device. */
  isAvailable(): boolean;
}
