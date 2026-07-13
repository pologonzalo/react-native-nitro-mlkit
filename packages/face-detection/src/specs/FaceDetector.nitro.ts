import type { HybridObject } from "react-native-nitro-modules";

/**
 * Bounding box of a detected face in image coordinates.
 */
export interface FaceBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Facial landmark point (e.g. left eye, nose, mouth).
 */
export interface FaceLandmark {
  type: FaceLandmarkType;
  x: number;
  y: number;
}

export type FaceLandmarkType =
  | "leftEye"
  | "rightEye"
  | "leftEar"
  | "rightEar"
  | "leftCheek"
  | "rightCheek"
  | "noseBase"
  | "mouthLeft"
  | "mouthRight"
  | "mouthBottom";

/**
 * A single detected face.
 */
export interface DetectedFace {
  /** Bounding box in image pixel coordinates */
  bounds: FaceBounds;
  /** Rotation of face around Y axis (-180 to 180) */
  headEulerAngleY: number;
  /** Rotation of face around Z axis (-180 to 180) */
  headEulerAngleZ: number;
  /** Probability of left eye being open (0..1) */
  leftEyeOpenProbability: number;
  /** Probability of right eye being open (0..1) */
  rightEyeOpenProbability: number;
  /** Probability of smiling (0..1) */
  smilingProbability: number;
  /** Face landmarks (if requested) */
  landmarks: FaceLandmark[];
  /** Tracking ID across frames (if tracking enabled) */
  trackingId: number;
}

/**
 * Options for face detection.
 */
export interface FaceDetectionOptions {
  /** Performance mode: 'fast' or 'accurate'. Default: 'fast' */
  performanceMode?: "fast" | "accurate";
  /** Detect landmarks (eyes, nose, mouth, ears). Default: false */
  landmarks?: boolean;
  /** Detect classifications (smile, eyes open). Default: false */
  classifications?: boolean;
  /** Minimum face size relative to image (0.0-1.0). Default: 0.1 */
  minFaceSize?: number;
  /** Enable face tracking across frames. Default: false */
  tracking?: boolean;
}

/**
 * Result of batch face detection.
 */
export interface BatchDetectionResult {
  /** Index in the input array */
  index: number;
  /** Detected faces for this image */
  faces: DetectedFace[];
  /** Whether detection succeeded */
  success: boolean;
  /** Error message if detection failed */
  error?: string;
}

/**
 * Options for batch processing.
 */
export interface BatchOptions extends FaceDetectionOptions {
  /** Max concurrent native operations (default: 4) */
  concurrency?: number;
  /** Also crop each detected face and return as temp file URI */
  cropFaces?: boolean;
  /** Padding ratio around face crop (0.0-1.0, default: 0.3) */
  cropPadding?: number;
}

/**
 * A cropped face with its URI and metadata.
 */
export interface CroppedFace {
  /** Temp file URI of the cropped face JPEG */
  uri: string;
  /** Which face index in the detection result */
  faceIndex: number;
  /** Width of the crop */
  width: number;
  /** Height of the crop */
  height: number;
}

/**
 * Result of batch detection with crops.
 */
export interface BatchCropResult {
  /** Index in the input array */
  index: number;
  /** Detected faces */
  faces: DetectedFace[];
  /** Cropped face images (if cropFaces=true) */
  crops: CroppedFace[];
  success: boolean;
  error?: string;
}

/**
 * The main face detection Nitro HybridObject.
 *
 * All processing happens on-device using ML Kit (Android) and
 * Vision framework (iOS). No network calls, no data leaves the device.
 */
export interface FaceDetector
  extends HybridObject<{ ios: "swift"; android: "kotlin" }> {
  /**
   * Detect faces in a single image.
   *
   * @param imageUri - Local file URI or asset URI
   * @param options - Detection options
   * @returns Array of detected faces
   */
  detect(imageUri: string, options?: FaceDetectionOptions): Promise<DetectedFace[]>;

  /**
   * Detect faces in multiple images in parallel (native-side batching).
   * This is the killer feature — one bridge call, N images processed natively.
   *
   * @param imageUris - Array of local file URIs
   * @param options - Detection + batch options
   * @returns Results for each image
   */
  detectBatch(
    imageUris: string[],
    options?: BatchOptions
  ): Promise<BatchCropResult[]>;

  /**
   * Detect the largest/primary face in an image (optimized for selfies).
   * Returns null if no face found.
   */
  detectPrimary(
    imageUri: string,
    options?: FaceDetectionOptions
  ): Promise<DetectedFace | undefined>;

  /**
   * Crop all detected faces from an image and return as temp file URIs.
   * Combines detection + cropping in a single native call.
   */
  cropFaces(
    imageUri: string,
    options?: FaceDetectionOptions & { padding?: number }
  ): Promise<CroppedFace[]>;

  /**
   * Check if face detection is available on this device.
   */
  isAvailable(): boolean;

  // ─── Face Recognition (MobileFaceNet, Apache 2.0) ─────────────────────────

  /**
   * Extract a face embedding from a cropped face image.
   * Uses MobileFaceNet (128-d vector, Apache 2.0 license).
   *
   * @param faceUri - URI of a cropped face image
   * @returns 128-dimensional embedding vector
   */
  extractEmbedding(faceUri: string): Promise<number[]>;

  /**
   * Compare two face embeddings and return similarity score (0..1).
   * Uses cosine similarity normalized to [0, 1].
   */
  compareFaces(embedding1: number[], embedding2: number[]): number;

  /**
   * All-in-one: detect primary face → crop → extract embedding.
   * Optimized single native call for selfie registration.
   *
   * @param imageUri - Full image (selfie)
   * @returns Embedding of the largest face, or undefined if no face found
   */
  extractPrimaryEmbedding(imageUri: string): Promise<number[] | undefined>;

  /**
   * Batch: detect faces in multiple images and extract embeddings.
   * One bridge call → N images processed → all embeddings returned.
   * This is the killer feature for gallery scanning.
   */
  detectAndEmbed(
    imageUris: string[],
    options?: BatchOptions & { embeddingThreshold?: number }
  ): Promise<BatchEmbeddingResult[]>;
}

/**
 * Result of batch detection + embedding extraction.
 */
export interface BatchEmbeddingResult {
  index: number;
  faces: DetectedFaceWithEmbedding[];
  success: boolean;
  error?: string;
}

/**
 * A detected face with its embedding included.
 */
export interface DetectedFaceWithEmbedding {
  bounds: FaceBounds;
  /** 128-d MobileFaceNet embedding */
  embedding: number[];
  /** Confidence of the face detection (0..1) */
  confidence: number;
}
