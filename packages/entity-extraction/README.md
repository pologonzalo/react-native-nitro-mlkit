# React Native ML Kit — Entity Extraction

**`@nitro-mlkit/entity-extraction`** · on-device Google ML Kit via [Nitro Modules](https://github.com/mrousavy/nitro) — JSI, no bridge.

> ⚠️ **Beta (`0.1.0-beta.x`).** **Android-only** — Google ML Kit has **no**
> Entity Extraction SDK on iOS. See [Platform status](#platform-status).

> 🚧 **Not published on npm.** This package is Android-only, so it is held back
> from the registry until it has an iOS implementation. It works today if you
> consume it from the [monorepo](https://github.com/pologonzalo/react-native-nitro-mlkit)
> — see [Installation](#installation).

High-performance, on-device **Entity Extraction** for React Native, built with
[Nitro Modules](https://github.com/mrousavy/nitro) (JSI, no bridge).

Powered by **Google ML Kit**. Given a block of text, finds the **actionable
entities** inside it — phone numbers, emails, addresses, dates & times, money,
URLs, flight numbers, IBANs, ISBNs, payment cards and tracking numbers — with
the exact character span of each match. **All on-device.** The English model
**downloads at runtime** on first use.

## Installation

This package is **not on npm yet** (Android-only — see the notice above). To use
it today, clone the monorepo and point your app at the workspace package:

```bash
git clone https://github.com/pologonzalo/react-native-nitro-mlkit
cd react-native-nitro-mlkit && pnpm install
```

Then add it to your app as a file dependency and rebuild:

```json
{ "dependencies": { "@nitro-mlkit/entity-extraction": "file:../react-native-nitro-mlkit/packages/entity-extraction" } }
```

No config plugin (autolinked Expo module). Install and `npx expo prebuild`.
Not available in Expo Go.

## Usage

```ts
import {
  NitroEntityExtraction,
  type DetectedEntity,
} from "@nitro-mlkit/entity-extraction";

// Downloads the model on first use, then annotates.
const entities: DetectedEntity[] = await NitroEntityExtraction.annotate(
  "Call me at 555-123-4567 or email a@b.com by Apr 3.",
);

for (const e of entities) {
  console.log(e.type, e.text, e.start, e.end);
  // "phone" "555-123-4567" 11 23
  // "email" "a@b.com" 36 43
  // "date_time" "Apr 3" 47 52
}

NitroEntityExtraction.isAvailable(); // true on Android, false elsewhere
```

### `DetectedEntity`

| field | type | notes |
| ----- | ---- | ----- |
| `type` | `string` | one of the entity types below, or `"unknown"` |
| `text` | `string` | the matched text |
| `start` | `number` | start offset (UTF-16 code units) within the input |
| `end` | `number` | end offset, exclusive |

**Entity types:** `address`, `email`, `phone`, `url`, `date_time`, `money`,
`flight_number`, `iban`, `isbn`, `payment_card`, `tracking_number`, `unknown`.

## Platform status

| Platform | Min | Status |
| -------- | --- | ------ |
| Android  | API 26+ | ✅ On-device; English model downloaded at runtime |
| iOS      | —   | ❌ Not supported — Google ML Kit has **no** Entity Extraction SDK on iOS |

`isAvailable()` returns `false` on iOS and `annotate()` rejects there, so you
can call it safely from cross-platform code and gate on the result.

## Part of `nitro-mlkit`

The full ML Kit suite on Nitro — see the other `@nitro-mlkit/*` packages.

## License

MIT © Gonzalo Polo
