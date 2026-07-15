# @nitro-mlkit/language-id

> ⚠️ **Beta (`0.1.0-beta.x`).** Android verified on-device; iOS builds & links but
> device runtime is pending — see [Platform status](#platform-status).

High-performance, on-device **language identification** for React Native, built
with [Nitro Modules](https://github.com/mrousavy/nitro) (JSI, no bridge).

Powered by **Google ML Kit**. Detects the language of a piece of text and
returns a BCP-47 tag. Text in, tag out — no images, no network.

## Installation

```bash
npm install @nitro-mlkit/language-id@beta react-native-nitro-modules
```

No config plugin (autolinked Expo module). Just install and `npx expo prebuild`.
Not available in Expo Go.

## Usage

```ts
import { NitroLanguageId } from "@nitro-mlkit/language-id";

const lang = await NitroLanguageId.identify("El veloz murciélago hindú");
// → "es"  (or "und" if undetermined)

const possible = await NitroLanguageId.identifyPossible("Portez ce vieux whisky");
// → [{ language: "fr", confidence: 0.99 }, ...] (sorted desc)

NitroLanguageId.isAvailable(); // boolean
```

## Platform status

| Platform | Min | Status |
| -------- | --- | ------ |
| Android  | API 21+ | ✅ Verified on-device (Pixel 9, API 36): en 100%, es 99% in ~70 ms |
| iOS      | 15.5+   | ⚠️ Swift impl written; on-device build & run pending¹ |
| tvOS/macOS | — | 🔜 Planned |

¹ ML Kit's iOS pods ship no `arm64` Simulator slice; validate on a physical device.

## Part of `nitro-mlkit`

The full ML Kit suite on Nitro — see the other `@nitro-mlkit/*` packages.

## License

MIT © Gonzalo Polo
