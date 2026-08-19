const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const ARM64_SIM_FIX_MARKER =
  "# @nitro-mlkit/face-detection: strip GoogleMLKit frameworks from simulator link";

// Google ML Kit's vendored frameworks (MLImage, MLKitCommon, MLKitFaceDetection,
// MLKitVision) ship no arm64 iOS-Simulator slice (confirmed against
// GoogleMLKit 9.0.0 — see HANDOFF.md). CocoaPods bakes `-framework "X"` for
// each of them directly into OTHER_LDFLAGS, so the arm64-simulator link
// fails with "building for iOS-Simulator, but linking in object file built
// for iOS" no matter what EXCLUDED_ARCHS you set on their own pod targets —
// that only gates each pod's OWN compile step, not this baked linker flag.
// HybridFaceDetector.swift already stubs out MLKit behind
// #if targetEnvironment(simulator), so nothing in OUR code needs these
// frameworks there — we just have to stop the linker from being told to
// load them for that sdk.
//
// IMPORTANT: this must run in `post_integrate`, NOT `post_install`. During
// post_install, CocoaPods hasn't finished computing the aggregated
// OTHER_LDFLAGS value yet (it's populated later, while writing the final
// xcconfig files) — reading `aggregate_target.xcconfigs` at that point
// returns an incomplete/stale value, silently dropping every other library
// (Expo, React, etc.) from the simulator link and causing a totally
// unrelated wall of "Undefined symbols" for Expo modules. `post_integrate`
// runs after CocoaPods has fully written the xcconfig files to disk, so we
// read/patch them directly as text there instead.
const ARM64_SIM_FIX_SNIPPET = `
${ARM64_SIM_FIX_MARKER}
post_integrate do |installer|
  mlkit_frameworks = ['MLImage', 'MLKitCommon', 'MLKitFaceDetection', 'MLKitVision']
  installer.aggregate_targets.each do |aggregate_target|
    aggregate_target.user_build_configurations.keys.each do |config_name|
      xcconfig_path = aggregate_target.xcconfig_path(config_name)
      next unless File.exist?(xcconfig_path)
      lines = File.read(xcconfig_path).split("\\n")
      base_idx = lines.index { |l| l.start_with?('OTHER_LDFLAGS = ') }
      sim_idx = lines.index { |l| l.start_with?('OTHER_LDFLAGS[sdk=iphonesimulator*] = ') }
      next unless base_idx
      base = lines[base_idx].sub('OTHER_LDFLAGS = ', '').gsub('$(inherited)', '').strip
      mlkit_frameworks.each do |fw|
        base = base.gsub(/-framework\\s+"#{fw}"\\s*/, '')
      end
      # SDK 55 generated a simulator-specific OTHER_LDFLAGS line we could edit;
      # SDK 57 / RN 0.86 no longer does, so create it when it's missing — an
      # sdk-qualified line fully overrides the base one for simulator builds.
      if sim_idx
        sim_extra = lines[sim_idx].sub('OTHER_LDFLAGS[sdk=iphonesimulator*] = ', '').gsub('$(inherited)', '').strip
        lines[sim_idx] = "OTHER_LDFLAGS[sdk=iphonesimulator*] = #{base} #{sim_extra}".strip
      else
        lines.insert(base_idx + 1, "OTHER_LDFLAGS[sdk=iphonesimulator*] = #{base}".strip)
      end
      File.write(xcconfig_path, lines.join("\\n"))
    end
  end
end
`;

function withMLKitSimulatorArchFix(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        "Podfile",
      );
      if (!fs.existsSync(podfilePath)) return cfg;

      const contents = fs.readFileSync(podfilePath, "utf-8");
      if (contents.includes(ARM64_SIM_FIX_MARKER)) return cfg;

      // post_integrate isn't declared by Expo's template, so (unlike
      // post_install) we can safely append our own standalone block.
      fs.writeFileSync(
        podfilePath,
        contents.trimEnd() + "\n" + ARM64_SIM_FIX_SNIPPET,
        "utf-8",
      );
      return cfg;
    },
  ]);
}

/**
 * Expo config plugin for @nitro-mlkit/face-detection.
 *
 * Android: Ensures ML Kit face detection bundled model is included.
 * iOS: MLKit is linked via the podspec automatically; a post_install hook
 * excludes arm64-simulator for MLKit's vendored frameworks (see
 * ARM64_SIM_FIX_HOOK above) since they have no such slice.
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
