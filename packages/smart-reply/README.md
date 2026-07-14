# @nitro-mlkit/smart-reply

> ⚠️ **Beta (`0.1.0-beta.x`).** Android verified on-device. **Android-only** —
> see [Platform status](#platform-status).

High-performance, on-device **Smart Reply** for React Native, built with
[Nitro Modules](https://github.com/mrousavy/nitro) (JSI, no bridge).

Powered by **Google ML Kit**. Given a chat conversation, suggests up to **3
short, contextual replies** for the local user — the "Sure!", "Sounds good 👍",
"What time?" chips you see in messaging apps. **English only. All on-device.**

## Installation

```bash
npm install @nitro-mlkit/smart-reply react-native-nitro-modules
```

No config plugin (autolinked Expo module). Install and `npx expo prebuild`.
Not available in Expo Go.

## Usage

```ts
import {
  NitroSmartReply,
  SmartReplyStatus,
  type ConversationMessage,
} from "@nitro-mlkit/smart-reply";

// Order oldest → newest. End with a REMOTE-user message (the one you reply to).
const conversation: ConversationMessage[] = [
  { text: "Hey! Want to grab lunch today?", timestamp: Date.now(), isLocalUser: false, userId: "friend" },
];

const result = await NitroSmartReply.suggestReplies(conversation);

if (result.status === SmartReplyStatus.SUCCESS) {
  console.log(result.suggestions); // e.g. ["Sure!", "Sounds good", "What time?"]
}

NitroSmartReply.isAvailable(); // true on Android, false elsewhere
```

### `ConversationMessage`

| field | type | notes |
| ----- | ---- | ----- |
| `text` | `string` | the message text |
| `timestamp` | `number` | Unix ms when the message was sent |
| `isLocalUser` | `boolean` | `true` = you; `false` = the other participant |
| `userId?` | `string` | required for remote messages; distinguishes participants |

### `SmartReplyStatus`

- `SUCCESS` — `suggestions` holds up to 3 replies.
- `NO_REPLY` — the model had nothing good to suggest.
- `NOT_SUPPORTED_LANGUAGE` — conversation isn't in a supported language (English only today).

## Platform status

| Platform | Min | Status |
| -------- | --- | ------ |
| Android  | API 26+ | ✅ Verified on-device (Pixel 9, API 36) |
| iOS      | —   | ❌ Not supported — Google ML Kit has **no** Smart Reply API on iOS |

`isAvailable()` returns `false` on iOS and `suggestReplies()` rejects there, so
you can call it safely from cross-platform code and gate on the result.

## Part of `nitro-mlkit`

The full ML Kit suite on Nitro — see the other `@nitro-mlkit/*` packages.

## License

MIT © Gonzalo Polo
