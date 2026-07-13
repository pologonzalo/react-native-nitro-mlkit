import type { HybridObject } from "react-native-nitro-modules";

// ─── Enums (Nitrogen requires explicit enums, not string unions) ────────────

export enum PerformanceMode {
  FAST = 0,
  ACCURATE = 1,
}

export enum FaceLandmarkType {
  LEFT_EYE = 0,
  RIGHT_EYE = 1,
  LEFT_EAR = 2,
  RIGHT_EAR = 3,
  LEFT_CHEEK = 4,
  RIGHT_CHEEK = 5,
  NOSE_BASE = 6,
  MOUTH_LEFT = 7,
  MOUTH_RIGHT = 8,
  MOUTH_BOTTOM = 9,
}

// ─── Structs ────────────────────────────────────────────────────────────────

export interface FaceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceLandmark {
  type: FaceLandmarkType;
  x: number;
  y: number;
}

export interface DetectedFace {
  bounds: FaceBounds;
  headEulerAngleY: number;
  headEulerAngleZ: number;
  leftEyeOpenProbability: number;
  rightEyeOpenProbability: number;
  smilingProbability: number;
  landmarks: FaceLandmark[];
  trackingId: number;
}

export interface FaceDetectionOptions {
  performanceMode: PerformanceMode;
  landmarks: boolean;
  classifications: boolean;
  minFaceSize: number;
  tracking: boolean;
}

export interface CroppedFace {
  uri: string;
  faceIndex: number;
  width: number;
  height: number;
}

export interface BatchCropResult {
  index: number;
  faces: DetectedFace[];
  crops: CroppedFace[];
  success: boolean;
}

export interface DetectedFaceWithEmbedding {
  bounds: FaceBounds;
  embedding: number[];
  confidence: number;
}

export interface BatchEmbeddingResult {
  index: number;
  faces: DetectedFaceWithEmbedding[];
  success: boolean;
}

// ─── HybridObject ───────────────────────────────────────────────────────────

/**
 * Face detection + recognition powered by ML Kit and MobileFaceNet.
 * All on-device, zero network, zero bridge overhead via Nitro.
 */
export interface FaceDetector extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  /**
   * Detect faces in a single image.
   */
  detect(
    imageUri: string,
    options: FaceDetectionOptions,
  ): Promise<DetectedFace[]>;

  /**
   * Detect faces in multiple images in parallel (native-side batching).
   */
  detectBatch(
    imageUris: string[],
    concurrency: number,
  ): Promise<BatchCropResult[]>;

  /**
   * Detect the largest face in an image (for selfies).
   */
  detectPrimary(imageUri: string): Promise<DetectedFace>;

  /**
   * Crop all detected faces from an image.
   */
  cropFaces(imageUri: string, padding: number): Promise<CroppedFace[]>;

  /**
   * Extract a 128-d face embedding from a cropped face.
   */
  extractEmbedding(faceUri: string): Promise<number[]>;

  /**
   * Compare two face embeddings. Returns cosine similarity (0..1).
   */
  compareFaces(embedding1: number[], embedding2: number[]): number;

  /**
   * Detect primary face + extract embedding in one native call.
   */
  extractPrimaryEmbedding(imageUri: string): Promise<number[]>;

  /**
   * Batch detect + embed all faces across N images. One bridge call.
   */
  detectAndEmbed(
    imageUris: string[],
    concurrency: number,
  ): Promise<BatchEmbeddingResult[]>;

  /**
   * Check if face detection is available.
   */
  isAvailable(): boolean;
}
