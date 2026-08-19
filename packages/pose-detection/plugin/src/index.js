const { withMLKitSimulatorArchFix } = require("./mlkitSimulatorArchFix");

/**
 * Expo config plugin for @nitro-mlkit/pose-detection.
 *
 * iOS-only: patches the generated Podfile so arm64-Simulator builds still
 * link — Google ML Kit ships no Simulator slice, so on the Simulator every
 * method throws a clear error instead (run on a device for real inference).
 * The Podfile block is shared with every other @nitro-mlkit plugin; any one
 * of them writing it covers the whole suite.
 * Android needs no config: the model is bundled by the gradle dependency.
 *
 * Usage in app.json:
 * {
 *   "plugins": ["@nitro-mlkit/pose-detection"]
 * }
 */
module.exports = withMLKitSimulatorArchFix;
