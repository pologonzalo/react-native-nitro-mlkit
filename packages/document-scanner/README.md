# React Native ML Kit — Document Scanner

**`@nitro-mlkit/document-scanner`** · on-device Google ML Kit via [Nitro Modules](https://github.com/mrousavy/nitro) — JSI, no bridge.

> ⚠️ **Beta (`0.1.0-beta.x`).** **Android-only** — Google ML Kit provides the
> Document Scanner on Android only. See [Platform status](#platform-status).

On-device **document scanner** for React Native, built with
[Nitro Modules](https://github.com/mrousavy/nitro) (JSI, no bridge).

Powered by **Google ML Kit** (Google Play services). Unlike the other packages
this is **not** a still-image API — `scan()` launches ML Kit's **full-screen
scanner UI** (automatic edge detection, perspective correction, filters,
multi-page, gallery import) and resolves with the captured pages as JPEGs and
(optionally) a combined PDF. The scanning UI and models are provided by Google
Play services.

## Installation

```bash
npm install @nitro-mlkit/document-scanner react-native-nitro-modules
```

No config plugin (autolinked Expo module). Install and `npx expo prebuild`.
Not available in Expo Go.

## Usage

```ts
import { NitroDocumentScanner } from "@nitro-mlkit/document-scanner";

const result = await NitroDocumentScanner.scan(
  10,    // pageLimit
  true,  // includePdf
  true,  // allowGalleryImport
);
// result.pageImageUris → ["file:///…/page1.jpg", …]
// result.pdfUri        → "file:///…/scan.pdf" (when includePdf)
// result.pageCount     → number

NitroDocumentScanner.isAvailable(); // true on Android, false elsewhere
```

`scan()` **rejects** if the user cancels the scanner.

## Platform status

| Platform | Min | Status |
| -------- | --- | ------ |
| Android  | API 26+ | ✅ Scanner UI + result plumbing (Pixel 9, API 36) |
| iOS      | —   | ❌ Not supported — Google ML Kit has **no** Document Scanner on iOS |

The scanner UI and models are downloaded by Google Play services on first use.

## Part of `nitro-mlkit`

The full ML Kit suite on Nitro — see the other `@nitro-mlkit/*` packages.

## License

MIT © Gonzalo Polo
