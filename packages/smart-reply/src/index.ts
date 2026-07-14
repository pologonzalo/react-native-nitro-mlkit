export { type SmartReplyGenerator } from "./specs/SmartReplyGenerator.nitro";
export { SmartReplyStatus } from "./specs/SmartReplyGenerator.nitro";
export type {
  ConversationMessage,
  SmartReplyResult,
} from "./specs/SmartReplyGenerator.nitro";

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NitroModules } from "react-native-nitro-modules";
import type {
  ConversationMessage,
  SmartReplyGenerator,
  SmartReplyResult,
} from "./specs/SmartReplyGenerator.nitro";

const ANDROID_ONLY =
  "@nitro-mlkit/smart-reply is Android-only — Google ML Kit does not provide a Smart Reply API on iOS.";

let instance: SmartReplyGenerator | undefined;

function getInstance(): SmartReplyGenerator {
  if (Platform.OS !== "android") throw new Error(ANDROID_ONLY);
  if (!instance) {
    requireOptionalNativeModule("NitroMLKitSmartReply");
    instance =
      NitroModules.createHybridObject<SmartReplyGenerator>("SmartReplyGenerator");
  }
  return instance;
}

/**
 * The shared SmartReplyGenerator. Android-only: `isAvailable()` returns false
 * on other platforms, and `suggestReplies()` rejects there.
 */
export const NitroSmartReply = {
  suggestReplies(
    conversation: ConversationMessage[],
  ): Promise<SmartReplyResult> {
    return getInstance().suggestReplies(conversation);
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
