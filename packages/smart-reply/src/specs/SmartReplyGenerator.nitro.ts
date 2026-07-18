import type { HybridObject } from "react-native-nitro-modules";

/**
 * A single message in the conversation history you pass to Smart Reply.
 *
 * The conversation should be ordered oldest → newest and end with a message
 * from a *remote* participant (the person you are replying to). Smart Reply
 * generates suggestions for the local user based on that history.
 */
export interface ConversationMessage {
  /** The message text. */
  text: string;
  /** Unix timestamp in milliseconds when the message was sent. */
  timestamp: number;
  /**
   * True if the *local* user (the one we generate replies for) sent this
   * message; false if a remote participant sent it.
   */
  isLocalUser: boolean;
  /**
   * A stable id for the remote participant. Required when `isLocalUser` is
   * false (used to distinguish participants in a group chat); ignored for
   * local-user messages.
   */
  userId?: string;
}

/**
 * Outcome of a Smart Reply request.
 * - SUCCESS: `suggestions` holds up to 3 replies.
 * - NO_REPLY: the model had no good suggestion (e.g. nothing to reply to).
 * - NOT_SUPPORTED_LANGUAGE: the conversation is not in a supported language
 *   (Smart Reply is English-only today).
 */
export enum SmartReplyStatus {
  SUCCESS = 0,
  NO_REPLY = 1,
  NOT_SUPPORTED_LANGUAGE = 2,
}

export interface SmartReplyResult {
  status: SmartReplyStatus;
  /**
   * Up to 3 suggested replies, most likely first.
   * Empty unless `status` is SUCCESS.
   */
  suggestions: string[];
}

/**
 * On-device Smart Reply powered by Google ML Kit.
 * Suggests short, contextual replies to a chat conversation — no network,
 * zero bridge overhead via Nitro. Text only, English only. All on-device.
 *
 * NOTE: Android-only. Google ML Kit does not provide a Smart Reply API on iOS,
 * so this HybridObject declares no iOS platform.
 */
export interface SmartReplyGenerator extends HybridObject<{
  android: "kotlin";
}> {
  /**
   * Suggest up to 3 short replies for the local user, given the conversation
   * history. The conversation should end with a remote-user message.
   */
  suggestReplies(conversation: ConversationMessage[]): Promise<SmartReplyResult>;

  /** Whether Smart Reply is available on this device. */
  isAvailable(): boolean;
}
