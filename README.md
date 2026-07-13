# react-native-nitro-mlkit

High-performance ML Kit modules for React Native, built with [Nitro Modules](https://github.com/mrousavy/nitro).

All processing runs **on-device** — no data leaves the phone, no cloud APIs, no Firebase required.

## Packages

| Package                                                    | Description                                            | Status     |
| ---------------------------------------------------------- | ------------------------------------------------------ | ---------- |
| [`@nitro-mlkit/face-detection`](./packages/face-detection) | Face detection with batch processing & native cropping | 🚧 WIP     |
| `@nitro-mlkit/image-labeling`                              | Image classification (400+ labels), safety filter, batch | 🚧 WIP |
| `@nitro-mlkit/face-recognition`                            | "This is Marcos" — register faces, find people in photos | 🚧 WIP |
| `@nitro-mlkit/barcode-scanning`                            | Barcode & QR code scanning                             | 📋 Planned |
| `@nitro-mlkit/text-recognition`                            | OCR text recognition                                   | 📋 Planned |

## Why Nitro?

Traditional React Native bridge:

```
JS → serialize → bridge queue → deserialize → Native → serialize → bridge → JS
     ~0.5ms      ~1ms           ~0.5ms                   ~0.5ms     ~1ms
                                                         Total: ~4ms per call
                                                         × 500 photos = 2000ms wasted
```

Nitro Modules:

```
JS → direct C++ call → Native → direct return → JS
     ~0.01ms                     ~0.01ms
                                 Total: ~0.02ms per call
                                 × 500 photos = 10ms (200x faster)
```

Plus: **batch processing** sends all 500 images in one call, processes them in parallel natively.

## Architecture

```
react-native-nitro-mlkit/
├── packages/
│   ├── face-detection/       → @nitro-mlkit/face-detection
│   ├── text-recognition/     → @nitro-mlkit/text-recognition (planned)
│   ├── barcode-scanning/     → @nitro-mlkit/barcode-scanning (planned)
│   └── image-labeling/       → @nitro-mlkit/image-labeling (planned)
├── example/                  → Expo example app
└── docs/
```

Each package:

- Installs independently (only download the ML Kit model you need)
- Has its own Expo config plugin
- Supports iOS + Android (tvOS/macOS planned)
- Uses Nitro HybridObjects for zero-copy data transfer

## Contributing

PRs welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT
