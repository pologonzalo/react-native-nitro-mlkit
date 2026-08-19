const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

// SAME marker as @nitro-mlkit/face-detection's plugin, on purpose. CocoaPods
// allows only ONE top-level `post_integrate` per Podfile (a second one raises
// "Specified multiple post_integrate hooks"), so the two plugins cooperate
// through a single block:
//   - whichever runs first appends the block under this marker;
//   - face-detection's plugin sees the marker and skips;
//   - THIS plugin, running second, widens the existing block's framework list
//     to cover TensorFlow Lite as well (in-place text patch, idempotent).
const ARM64_SIM_FIX_MARKER =
  "# @nitro-mlkit/face-detection: strip GoogleMLKit frameworks from simulator link";

// Why the block exists at all: Google ML Kit's vendored frameworks ship no
// arm64 iOS-Simulator slice, and TensorFlowLiteC (pulled in by
// TensorFlowLiteSwift for the embedding model) has the same gap. CocoaPods
// bakes `-framework "X"` for each of them into the aggregate OTHER_LDFLAGS,
// so an arm64-simulator link fails no matter what EXCLUDED_ARCHS says.
// HybridFaceRecognizer.swift already stubs everything behind
// #if targetEnvironment(simulator); this hook just stops the linker from
// being told to load those frameworks for that sdk.
//
// `-l"TensorFlowLiteSwift"` is stripped too: it's a source pod so it DOES
// build for the simulator, but RN apps link with -ObjC, which force-loads its
// objects — and those reference TensorFlowLiteC symbols that aren't there.
//
// Must run in `post_integrate`, NOT `post_install`: during post_install
// CocoaPods hasn't finished writing the aggregated OTHER_LDFLAGS yet, and
// reading it there silently drops every other library from the simulator
// link (see the identical note in face-detection's plugin).
const STRIPPED_FRAMEWORKS = [
  "MLImage",
  "MLKitCommon",
  "MLKitFaceDetection",
  "MLKitVision",
  "TensorFlowLiteC",
  "TensorFlowLiteCCoreML",
  "TensorFlowLiteCMetal",
];

const STRIPPED_LIBS = ["TensorFlowLiteSwift"];

const ARM64_SIM_FIX_SNIPPET = `
${ARM64_SIM_FIX_MARKER}
post_integrate do |installer|
  mlkit_frameworks = [${STRIPPED_FRAMEWORKS.map((f) => `'${f}'`).join(", ")}]
  mlkit_libs = [${STRIPPED_LIBS.map((l) => `'${l}'`).join(", ")}]
  installer.aggregate_targets.each do |aggregate_target|
    aggregate_target.user_build_configurations.keys.each do |config_name|
      xcconfig_path = aggregate_target.xcconfig_path(config_name)
      next unless File.exist?(xcconfig_path)
      lines = File.read(xcconfig_path).split("\\n")
      base_idx = lines.index { |l| l.start_with?('OTHER_LDFLAGS = ') }
      sim_idx = lines.index { |l| l.start_with?('OTHER_LDFLAGS[sdk=iphonesimulator*] = ') }
      next unless base_idx && sim_idx
      base = lines[base_idx].sub('OTHER_LDFLAGS = ', '').gsub('$(inherited)', '').strip
      mlkit_frameworks.each do |fw|
        base = base.gsub(/-framework\\s+"#{fw}"\\s*/, '')
      end
      mlkit_libs.each do |lib|
        base = base.gsub(/-l"#{lib}"\\s*/, '')
      end
      sim_extra = lines[sim_idx].sub('OTHER_LDFLAGS[sdk=iphonesimulator*] = ', '').gsub('$(inherited)', '').strip
      lines[sim_idx] = "OTHER_LDFLAGS[sdk=iphonesimulator*] = #{base} #{sim_extra}".strip
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

      if (!contents.includes(ARM64_SIM_FIX_MARKER)) {
        // First one in: append the full block (face-detection's plugin will
        // see the marker and skip its own copy).
        fs.writeFileSync(
          podfilePath,
          contents.trimEnd() + "\n" + ARM64_SIM_FIX_SNIPPET,
          "utf-8",
        );
        return cfg;
      }

      // face-detection's block is already there — widen its framework list in
      // place. Idempotent: skips if TensorFlowLiteC is already covered.
      if (!contents.includes("'TensorFlowLiteC'")) {
        let patched = contents.replace(
          /mlkit_frameworks = \[[^\]]*\]/,
          `mlkit_frameworks = [${STRIPPED_FRAMEWORKS.map((f) => `'${f}'`).join(", ")}]`,
        );
        // The face-detection variant of the block has no lib-stripping loop;
        // add one right after the frameworks loop if it's missing.
        if (!patched.includes("mlkit_libs")) {
          patched = patched.replace(
            /(mlkit_frameworks\.each do \|fw\|\s*\n\s*base = base\.gsub\(\/-framework\\s\+"#\{fw\}"\\s\*\/, ''\)\s*\n\s*end)/,
            `$1\n      [${STRIPPED_LIBS.map((l) => `'${l}'`).join(", ")}].each do |lib|\n        base = base.gsub(/-l"#{lib}"\\s*/, '')\n      end`,
          );
        }
        fs.writeFileSync(podfilePath, patched, "utf-8");
      }
      return cfg;
    },
  ]);
}

/**
 * Expo config plugin for @nitro-mlkit/face-recognition.
 *
 * Android: ensures ML Kit downloads/bundles the face model (same meta-data as
 * face-detection's plugin; skipped when already present).
 * iOS: GoogleMLKit + TensorFlowLite are linked via the podspec; the Podfile
 * hook above strips them from the arm64-simulator link, where neither ships
 * a slice (the Swift impl stubs itself out there).
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
