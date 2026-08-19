const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");
const { withMLKitSimulatorArchFix } = require("./mlkitSimulatorArchFix");

/**
 * Expo config plugin for @nitro-mlkit/face-recognition.
 *
 * Android: ensures ML Kit downloads/bundles the face model (same meta-data as
 * face-detection's plugin; skipped when already present).
 * iOS: GoogleMLKit + TensorFlowLite are linked via the podspec; the shared
 * mlkitSimulatorArchFix Podfile hook strips them from the arm64-Simulator
 * link, where neither ships a slice (the Swift impl stubs itself out there).
 * The pattern-based strip covers TensorFlowLiteC and the -ObjC-force-loaded
 * `-l"TensorFlowLiteSwift"` — the per-list widening this plugin used to do
 * in older betas is no longer needed.
 *
 * Usage in app.json:
 * {
 *   "plugins": ["@nitro-mlkit/face-recognition"]
 * }
 */
function withNitroMLKitRecognition(config) {
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

        // tools:replace avoids a manifest-merge conflict with other
        // MLKit-based modules declaring the same key with another value.
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

  config = withMLKitSimulatorArchFix(config);

  return config;
}

module.exports = withNitroMLKitRecognition;
