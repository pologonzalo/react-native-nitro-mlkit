const { withDangerousMod, withPlugins } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Expo config plugin for @nitro-mlkit/face-detection.
 *
 * Android: Adds ML Kit face detection dependency to build.gradle.
 * iOS: ML Kit is added via the podspec, no extra config needed.
 */
function withNitroMLKitFace(config) {
  // Android: ensure ML Kit dependency is in build.gradle
  config = withDangerousMod(config, [
    "android",
    (cfg) => {
      const buildGradlePath = path.join(
        cfg.modRequest.platformProjectRoot,
        "app",
        "build.gradle",
      );

      if (fs.existsSync(buildGradlePath)) {
        let contents = fs.readFileSync(buildGradlePath, "utf-8");
        const mlkitDep =
          "implementation 'com.google.mlkit:face-detection:16.1.7'";

        if (!contents.includes("com.google.mlkit:face-detection")) {
          // Add after the dependencies { line
          contents = contents.replace(
            /dependencies\s*\{/,
            `dependencies {\n    ${mlkitDep}`,
          );
          fs.writeFileSync(buildGradlePath, contents, "utf-8");
        }
      }
      return cfg;
    },
  ]);

  return config;
}

module.exports = withNitroMLKitFace;
