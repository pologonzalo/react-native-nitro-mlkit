import type { HybridObject } from "react-native-nitro-modules";

/** A single detected entity inside a text span. */
export interface DetectedEntity {
  /** Entity type: "address","email","phone","url","date_time","money","flight_number","iban","isbn","payment_card","tracking_number","unknown". */
  type: string;
  /** The matched text. */
  text: string;
  /** Start offset (UTF-16 code units) within the input. */
  start: number;
  /** End offset (exclusive). */
  end: number;
}

/**
 * On-device entity extraction powered by Google ML Kit. Finds actionable
 * entities (phones, emails, addresses, dates, money, tracking numbers, ...)
 * in text. English model by default; downloads at runtime. Android-only.
 */
export interface EntityExtractor extends HybridObject<{ android: "kotlin" }> {
  /** Extract entities from text. Downloads the model on first use. */
  annotate(text: string): Promise<DetectedEntity[]>;
  isAvailable(): boolean;
}
