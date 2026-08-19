const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");
const { withMLKitSimulatorArchFix } = require("./mlkitSimulatorArchFix");

/**
 * Expo config plugin for @nitro-mlkit/face-detection.
 *
 * Android: Ensures ML Kit face detection bundled model is included.
 * iOS: MLKit is linked via the podspec automatically; the shared
 * mlkitSimulatorArchFix Podfile hook strips ML Kit's device-only frameworks
 * from the arm64-Simulator link (they ship no Simulator slice — the Swift
 * impl stubs itself out there).
 *
 * Usage in app.json:
 * {
 *   "plugins": ["@nitro-mlkit/face-detection"]
 * }
 */
function withNitroMLKitFace(config) {
  // Android: Add meta-data for bundled ML Kit model download
  config = withDangerousMod(config, [
    "android",
    (cfg) => {
      const manifestPath = path.join(
        cfg.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "AndroidManifest.xml",
      );

      if (fs.existsSync(manifestPath)) {
        let contents = fs.readFileSync(manifestPath, "utf-8");

        // Ensure ML Kit uses bundled model (offline-first).
        // tools:replace avoids a manifest-merge conflict with other MLKit-based
        // Expo modules (e.g. expo-camera's barcode scanner) declaring the same
        // meta-data key with a different value.
        const metaData = `        <meta-data
            android:name="com.google.mlkit.vision.DEPENDENCIES"
            android:value="face"
            tools:replace="android:value" />`;

        if (!contents.includes("com.google.mlkit.vision.DEPENDENCIES")) {
          contents = contents.replace(
            "</application>",
            `${metaData}\n    </application>`,
          );
          fs.writeFileSync(manifestPath, contents, "utf-8");
        }
      }
      return cfg;
    },
  ]);

  // iOS: podspec handles the MLKit dependency; this just patches the
  // generated Podfile so arm64-simulator doesn't try to link it.
  config = withMLKitSimulatorArchFix(config);

  return config;
}

module.exports = withNitroMLKitFace;
