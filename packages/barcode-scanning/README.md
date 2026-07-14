# @nitro-mlkit/barcode-scanning

> ⚠️ **Beta (`0.1.0-beta.x`).** Android is verified on-device. iOS builds and
> links (GoogleMLKit via CocoaPods) but on-device runtime validation is still
> pending — see [Platform status](#platform-status). API may change before `0.1.0`.

High-performance, on-device **barcode & QR scanning** for React Native, built
with [Nitro Modules](https://github.com/mrousavy/nitro) — JSI, synchronous
crossing, no bridge and no JSON serialization.

Powered by **Google ML Kit**'s bundled barcode model. Detects every common 1D
and 2D symbology (QR, EAN-13/8, UPC-A/E, Code 128/39/93, Codabar, ITF, Data
Matrix, PDF417, Aztec) from a still image. **All on-device — nothing leaves the phone.**

## Installation

```bash
npm install @nitro-mlkit/barcode-scanning@beta react-native-nitro-modules
```

Ships native code, so it does **not** run in Expo Go — use a development build
or the bare workflow. **No config plugin**: it's an Expo module, autolinked
automatically. Just install and prebuild:

```bash
npx expo prebuild
```

## Usage

```ts
import { NitroBarcode } from "@nitro-mlkit/barcode-scanning";

// Scan every barcode / QR in an image
const codes = await NitroBarcode.scan(imageUri);
// → [{ rawValue: "https://…", displayValue, format: "QR_CODE", valueType: "URL", bounds }]

// Just the first one (or undefined)
const first = await NitroBarcode.scanFirst(imageUri);

// Native batch — ONE JSI call, N images scanned concurrently
const results = await NitroBarcode.scanBatch(galleryUris, 4 /* concurrency */);
// → [{ index, barcodes, success, error? }]

NitroBarcode.isAvailable(); // boolean
```

`format` is a symbology name (`"QR_CODE"`, `"EAN_13"`, `"CODE_128"`, `"PDF417"`,
…). `valueType` is the semantic content type (`"URL"`, `"TEXT"`, `"WIFI"`,
`"PHONE"`, `"PRODUCT"`, `"CONTACT_INFO"`, …).

## API

| Method                             | Status |
| ---------------------------------- | ------ |
| `scan(uri)`                        | ✅     |
| `scanFirst(uri)`                   | ✅     |
| `scanBatch(uris, concurrency)`     | ✅ native concurrency |
| `isAvailable()`                    | ✅     |

## Platform status

| Platform     | Min version | Status                                                                                   |
| ------------ | ----------- | ---------------------------------------------------------------------------------------- |
| Android      | API 21+     | ✅ Verified on-device (Pixel 9 emulator, API 36): QR→URL in ~117 ms, EAN-13→PRODUCT in ~11 ms, batch 20 imgs in one call (~200 ms) |
| iOS          | 15.5+       | ⚠️ Builds & links (GoogleMLKit via CocoaPods); device run pending¹                        |
| tvOS / macOS | —           | 🔜 Planned                                                                               |

¹ Google ML Kit's iOS pods ship no `arm64` **Simulator** slice, so iOS must be
validated on a physical device.

## Part of `nitro-mlkit`

The full ML Kit suite on Nitro. See also
[`@nitro-mlkit/face-detection`](https://www.npmjs.com/package/@nitro-mlkit/face-detection)
and [`@nitro-mlkit/image-labeling`](https://www.npmjs.com/package/@nitro-mlkit/image-labeling).

## License

MIT © Gonzalo Polo
