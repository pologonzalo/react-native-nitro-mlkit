export { type FaceMeshDetector } from "./specs/FaceMeshDetector.nitro";
export type { BatchMeshResult, MeshPoint } from "./specs/FaceMeshDetector.nitro";

import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import { NitroModules } from "react-native-nitro-modules";
import type { FaceMeshDetector } from "./specs/FaceMeshDetector.nitro";

if (Platform.OS === "android") {
  requireOptionalNativeModule("NitroMLKitMesh");
}

/** Get the shared FaceMeshDetector instance. */
export const NitroFaceMesh =
  NitroModules.createHybridObject<FaceMeshDetector>("FaceMeshDetector");
