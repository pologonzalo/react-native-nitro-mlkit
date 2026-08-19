const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

// ─────────────────────────────────────────────────────────────────────────────
// Shared across EVERY @nitro-mlkit/* config plugin — identical copies ship in
// each package (they must be self-contained on npm). Edit the monorepo copy
// and re-sync all of them; don't let them drift.
//
// The MARKER is shared on purpose. CocoaPods allows only ONE top-level
// `post_integrate` per Podfile (a second raises "Specified multiple
// post_integrate hooks"), so all plugins cooperate through a single block:
// whichever runs first writes it, the rest see the marker and skip. The
// marker string still names face-detection because published versions
// (face-detection ≤0.1.0-beta.4, face-recognition ≤0.1.0-beta.2) key their
// skip/widen logic on that exact string — renaming it would make a
// mixed-version app write TWO post_integrate blocks and break pod install.
// ─────────────────────────────────────────────────────────────────────────────
const ARM64_SIM_FIX_MARKER =
  "# @nitro-mlkit/face-detection: strip GoogleMLKit frameworks from simulator link";

// Any string unique to the CANONICAL (pattern-based) block, used to tell it
// apart from the old per-package-list block that ships in older betas.
const CANONICAL_SENTINEL = "MLKit[A-Za-z0-9]*";

// Why the block exists: Google ML Kit's vendored frameworks (MLKit*, MLImage)
// ship no arm64 iOS-Simulator slice — none of them, for any ML Kit version —
// and TensorFlowLiteC (pulled in by face-recognition's TensorFlowLiteSwift)
// has the same gap. CocoaPods bakes `-framework "X"` for each directly into
// the aggregated OTHER_LDFLAGS, so an arm64-simulator link fails with
// "building for iOS-Simulator, but linking in object file built for iOS" no
// matter what EXCLUDED_ARCHS says (that only gates each pod's OWN compile
// step). Every @nitro-mlkit Swift impl stubs itself out behind
// #if targetEnvironment(simulator), so nothing in our code needs these
// frameworks there — the linker just has to stop being told to load them.
//
// The strip is PATTERN-based (MLKit*, MLImage, TensorFlowLite*, incl.
// 'TensorFlowLiteC') so one block covers the whole suite — older betas
// carried a hand-kept list per package and missed everyone else's frameworks.
//
// `-l"TensorFlowLite..."` is stripped too: TensorFlowLiteSwift is a source
// pod so it DOES build for the simulator, but RN apps link with -ObjC, which
// force-loads its objects — and those reference TensorFlowLiteC symbols that
// aren't there.
//
// IMPORTANT: this must run in `post_integrate`, NOT `post_install`. During
// post_install, CocoaPods hasn't finished computing the aggregated
// OTHER_LDFLAGS value yet (it's populated later, while writing the final
// xcconfig files) — reading it there returns an incomplete value, silently
// dropping every other library (Expo, React, …) from the simulator link and
// causing an unrelated wall of "Undefined symbols". `post_integrate` runs
// after CocoaPods has fully written the xcconfig files to disk, so we
// read/patch them directly as text.
//
// SDK 55 generated a simulator-specific OTHER_LDFLAGS line we could edit;
// SDK 57 / RN 0.86 no longer does, so the block creates it when missing — an
// sdk-qualified line fully overrides the base one for that sdk.
const ARM64_SIM_FIX_SNIPPET = `
${ARM64_SIM_FIX_MARKER}
post_integrate do |installer|
  installer.aggregate_targets.each do |aggregate_target|
    aggregate_target.user_build_configurations.keys.each do |config_name|
      xcconfig_path = aggregate_target.xcconfig_path(config_name)
      next unless File.exist?(xcconfig_path)
      lines = File.read(xcconfig_path).split("\\n")
      base_idx = lines.index { |l| l.start_with?('OTHER_LDFLAGS = ') }
      sim_idx = lines.index { |l| l.start_with?('OTHER_LDFLAGS[sdk=iphonesimulator*] = ') }
      next unless base_idx
      base = lines[base_idx].sub('OTHER_LDFLAGS = ', '').gsub('$(inherited)', '').strip
      base = base.gsub(/-framework\\s+"(MLKit[A-Za-z0-9]*|MLImage|TensorFlowLite[A-Za-z]*)"\\s*/, '')
      base = base.gsub(/-l"TensorFlowLite[A-Za-z]*"\\s*/, '')
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

/**
 * Patches the generated Podfile so arm64-simulator builds stop trying to link
 * Google ML Kit's (and TensorFlow Lite's) device-only frameworks.
 *
 * Choreography, in order of what this plugin finds in the Podfile:
 *  1. No marker → append the canonical block.
 *  2. Marker + old per-list block (from an older @nitro-mlkit beta running
 *     first) → replace that whole block with the canonical one, which is a
 *     superset of every list any beta ever shipped.
 *  3. Marker + canonical block → nothing to do.
 */
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
        // post_integrate isn't declared by Expo's template, so (unlike
        // post_install) we can safely append our own standalone block.
        fs.writeFileSync(
          podfilePath,
          contents.trimEnd() + "\n" + ARM64_SIM_FIX_SNIPPET,
          "utf-8",
        );
        return cfg;
      }

      if (!contents.includes(CANONICAL_SENTINEL)) {
        // An OLDER plugin wrote its per-list block first. Swap the whole block
        // for the canonical one: from the marker line to the block's closing
        // `end` at column 0 (inner `end`s are indented, so this anchor is
        // unambiguous).
        const escaped = ARM64_SIM_FIX_MARKER.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );
        const oldBlock = new RegExp(`${escaped}\\n[\\s\\S]*?\\nend\\n`);
        if (oldBlock.test(contents)) {
          fs.writeFileSync(
            podfilePath,
            contents.replace(oldBlock, ARM64_SIM_FIX_SNIPPET.trimStart()),
            "utf-8",
          );
        }
        return cfg;
      }

      return cfg;
    },
  ]);
}

module.exports = { withMLKitSimulatorArchFix, ARM64_SIM_FIX_MARKER };
