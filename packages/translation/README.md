# @nitro-mlkit/translation

> ⚠️ **Beta (`0.1.0-beta.x`).** Android verified on-device. iOS builds & links
> but device runtime is pending — see [Platform status](#platform-status).

High-performance, on-device **translation** for React Native, built with
[Nitro Modules](https://github.com/mrousavy/nitro) (JSI, no bridge).

Powered by **Google ML Kit**. Translate between 50+ languages, entirely on-device
once the language model is downloaded. Language codes are BCP-47 (e.g. `"en"`,
`"es"`, `"fr"`, `"de"`, `"ja"`).

## Installation

```bash
npm install @nitro-mlkit/translation@beta react-native-nitro-modules
```

No config plugin (autolinked Expo module). Just install and `npx expo prebuild`.
Not available in Expo Go.

## Usage

```ts
import { NitroTranslate } from "@nitro-mlkit/translation";

// Translate (downloads the required model on first use).
const out = await NitroTranslate.translate("Hello, world", "en", "es");
// → "Hola, mundo"

// Manage models explicitly.
await NitroTranslate.downloadModel("es", /* requireWifi */ true);
await NitroTranslate.isModelDownloaded("es"); // → true
await NitroTranslate.getDownloadedModels();   // → ["en", "es", ...]
await NitroTranslate.deleteModel("es");

NitroTranslate.isAvailable(); // boolean
```

## Models

Translation runs on-device, but each language pairs against a downloadable model
(~30 MB per language). The first `translate()` call for a language downloads its
model (needs network and may take a few seconds); subsequent calls are fully
offline. Pre-download with `downloadModel()` and gate large downloads behind
Wi-Fi via the `requireWifi` flag.

## Platform status

| Platform | Min | Status |
| -------- | --- | ------ |
| Android  | API 26+ | ✅ Verified on-device (Pixel 9, API 36): en→es in ~2.5 s (incl. first-run model download) |
| iOS      | 15.5+   | ⚠️ Builds & links (GoogleMLKit); device run pending¹ |
| tvOS/macOS | — | 🔜 Planned |

¹ ML Kit's iOS pods ship no `arm64` Simulator slice; validate on a physical device.

## Part of `nitro-mlkit`

The full ML Kit suite on Nitro — see the other `@nitro-mlkit/*` packages.

## License

MIT © Gonzalo Polo
