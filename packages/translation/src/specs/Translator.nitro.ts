import type { HybridObject } from "react-native-nitro-modules";

/**
 * On-device translation powered by Google ML Kit. 50+ languages, all on-device
 * once the language model is downloaded. Language codes are BCP-47 (e.g. "en",
 * "es", "fr", "de", "ja").
 */
export interface Translator extends HybridObject<{ ios: "swift"; android: "kotlin" }> {
  /**
   * Translate text from source → target language. Downloads the required model
   * on first use (may take a few seconds / need network).
   */
  translate(text: string, sourceLanguage: string, targetLanguage: string): Promise<string>;
  /** Download a language model ahead of time. */
  downloadModel(language: string, requireWifi: boolean): Promise<void>;
  /** Whether a language model is already downloaded. */
  isModelDownloaded(language: string): Promise<boolean>;
  /** Delete a downloaded language model. */
  deleteModel(language: string): Promise<void>;
  /** BCP-47 tags of all currently downloaded models. */
  getDownloadedModels(): Promise<string[]>;
  isAvailable(): boolean;
}
