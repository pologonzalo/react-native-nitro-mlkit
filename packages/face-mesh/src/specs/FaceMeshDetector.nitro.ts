import type { HybridObject } from "react-native-nitro-modules";

/**
 * A single face-mesh point (one of 468) with its 3D position.
 */
export interface MeshPoint {
  /** Point index (0..467). */
  index: number;
  x: number;
  y: number;
  z: number;
}

/**
 * Result of detecting a face mesh in one image within a batch.
 */
export interface BatchMeshResult {
  index: number;
  /** The mesh points (empty if no face was found). */
  points: MeshPoint[];
  success: boolean;
  error?: string;
}

/**
 * On-device face mesh detection powered by MLKit.
 * Returns up to 468 3D mesh points for the primary face in a still image.
 */
export interface FaceMeshDetector extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  /** Detect the primary face mesh; returns its 468 points. */
  detect(imageUri: string): Promise<MeshPoint[]>;

  /** Detect face meshes across many images in parallel (one native call). */
  detectBatch(
    imageUris: string[],
    concurrency: number,
  ): Promise<BatchMeshResult[]>;

  /** Whether face mesh detection is available on this device. */
  isAvailable(): boolean;
}
