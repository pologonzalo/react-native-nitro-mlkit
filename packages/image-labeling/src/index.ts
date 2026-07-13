export { type ImageLabeler } from "./specs/ImageLabeler.nitro";
export type {
  BatchLabelOptions,
  BatchLabelResult,
  ImageLabel,
  LabelingOptions,
  SafetyResult,
} from "./specs/ImageLabeler.nitro";

import { NitroModules } from "react-native-nitro-modules";
import type { ImageLabeler } from "./specs/ImageLabeler.nitro";

/**
 * Get the shared ImageLabeler instance.
 */
export const NitroLabeler =
  NitroModules.createHybridObject<ImageLabeler>("ImageLabeler");
