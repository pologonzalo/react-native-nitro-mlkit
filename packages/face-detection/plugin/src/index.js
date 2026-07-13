const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo config plugin for @nitro-mlkit/face-detection.
 *
 * Android: Ensures ML Kit face detection bundled model is included.
 * iOS: MLKit is linked via the podspec automatically.
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

        // Ensure ML Kit uses bundled model (offline-first)
        const metaData = `        <meta-data
            android:name="com.google.mlkit.vision.DEPENDENCIES"
            android:value="face" />`;

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

  // iOS: No extra config needed — podspec handles MLKit dependency.
  // Expo autolinking picks up the podspec automatically.

  return config;
}

module.exports = withNitroMLKitFace;
