export { type FaceMeshDetector } from "./specs/FaceMeshDetector.nitro";
export type { BatchMeshResult, MeshPoint } from "./specs/FaceMeshDetector.nitro";

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NitroModules } from "react-native-nitro-modules";
import type { FaceMeshDetector } from "./specs/FaceMeshDetector.nitro";

/**
 * ML Kit Face Mesh Detection is an **Android-only** API — Google ships no iOS SDK
 * for it (there is no `GoogleMLKit/FaceMeshDetection` CocoaPod). On iOS this module
 * is not linked, so accessing `NitroFaceMesh` throws a clear, actionable error
 * instead of crashing the JS bundle at import time.
 */
export const isFaceMeshSupported = Platform.OS === "android";

const ANDROID_ONLY_MESSAGE =
  "@nitro-mlkit/face-mesh is Android-only: ML Kit Face Mesh Detection has no iOS SDK.";

function createAndroidDetector(): FaceMeshDetector {
  requireOptionalNativeModule("NitroMLKitMesh");
  return NitroModules.createHybridObject<FaceMeshDetector>("FaceMeshDetector");
}

/** The shared FaceMeshDetector instance. Android-only — throws on other platforms. */
export const NitroFaceMesh: FaceMeshDetector = isFaceMeshSupported
  ? createAndroidDetector()
  : new Proxy({} as FaceMeshDetector, {
      get() {
        throw new Error(ANDROID_ONLY_MESSAGE);
      },
    });
