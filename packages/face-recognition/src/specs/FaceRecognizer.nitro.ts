import type { HybridObject } from "react-native-nitro-modules";

/**
 * A face embedding — a numeric vector representing a unique face.
 */
export interface FaceEmbedding {
  /** 128-dimensional face embedding from MobileFaceNet */
  vector: number[];
}

/**
 * A registered person in the face registry.
 */
export interface RegisteredPerson {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Average embedding (from 1+ reference photos) */
  embedding: number[];
  /** How many reference images contributed to this embedding */
  sampleCount: number;
}

/**
 * Result of a face search — who is this person?
 */
export interface FaceSearchResult {
  /** Matched person info */
  person: RegisteredPerson;
  /** Similarity score (0..1) */
  similarity: number;
}

/**
 * Options for batch photo scanning.
 */
export interface FindPeopleOptions {
  /** Max concurrent native operations (default: 4) */
  concurrency?: number;
  /** Minimum similarity to count as a match (0..1). Default: 0.6 */
  minSimilarity?: number;
}

/**
 * Result of scanning a photo for known people.
 */
export interface PhotoPersonResult {
  /** Index in batch input */
  index: number;
  /** People found in this photo */
  people: FaceSearchResult[];
  /** Number of unidentified faces */
  unknownFaces: number;
  /** Total faces detected */
  totalFaces: number;
  success: boolean;
  error?: string;
}

/**
 * Face Recognition HybridObject.
 *
 * MLKit for detection + MobileFaceNet (Apache 2.0) for embeddings.
 * Includes an in-memory registry for quick person lookup.
 *
 * Typical flow:
 * 1. Player takes selfie → registerPerson("marcos", selfieUri)
 * 2. Scan gallery → findPeopleInPhotos(galleryUris)
 * 3. Get results → "Photo 42 has Marcos (92% confidence)"
 */
export interface FaceRecognizer extends HybridObject<{
  ios: "swift";
  android: "kotlin";
}> {
  // ─── Model ────────────────────────────────────────────────────────────────
  // Recognition needs a face-embedding model (e.g. MobileFaceNet, ~5 MB,
  // Apache-2.0) running on TensorFlow Lite. ML Kit only does *detection*, so you
  // provide the embedding model once; it is cached on disk. `register*` and
  // `find*` throw until a model is ready. Input/output tensor shapes are read
  // from the model, so 128-d and 192-d MobileFaceNet variants both work.

  /**
   * Download a `.tflite` face-embedding model from `url` into app storage and
   * load it. Call once; subsequent launches can `loadModel()` the cached file.
   */
  downloadModel(url: string): Promise<boolean>;

  /** Load a `.tflite` model already on disk (bundled asset or previous download). */
  loadModel(fileUri: string): Promise<boolean>;

  /** Whether an embedding model is loaded and ready. */
  isModelReady(): boolean;

  // ─── Person Registry ────────────────────────────────────────────────────

  /**
   * Register a person from a photo (typically a selfie).
   * Detects the largest face, extracts embedding, stores in registry.
   *
   * @param id - Unique person ID (e.g. player deviceId)
   * @param name - Display name
   * @param imageUri - Photo with the person's face
   * @returns true if registration succeeded
   */
  registerPerson(id: string, name: string, imageUri: string): Promise<boolean>;

  /**
   * Add another reference photo for an existing person.
   * Improves recognition accuracy by averaging multiple embeddings.
   */
  addReference(id: string, imageUri: string): Promise<boolean>;

  /**
   * Remove a person from the registry.
   */
  removePerson(id: string): void;

  /**
   * Clear all registered people (e.g. between game sessions).
   */
  clearRegistry(): void;

  /**
   * Get all registered people.
   */
  getRegistry(): RegisteredPerson[];

  // ─── Recognition ────────────────────────────────────────────────────────

  /**
   * Find registered people in a single photo.
   */
  findPeople(imageUri: string): Promise<FaceSearchResult[]>;

  /**
   * Batch: find registered people across many photos (one bridge call).
   * THE killer feature for gallery scanning.
   *
   * @param imageUris - Array of photo URIs
   * @param options - concurrency, minSimilarity threshold
   * @returns Per-photo results with all identified people
   */
  findPeopleInPhotos(
    imageUris: string[],
    options?: FindPeopleOptions,
  ): Promise<PhotoPersonResult[]>;

  /**
   * Compare a specific face crop against the registry.
   * Lower-level API when you already have a cropped face.
   */
  identifyFace(faceUri: string): Promise<FaceSearchResult | undefined>;

  /**
   * Extract raw embedding from a face crop (for custom matching logic).
   */
  extractEmbedding(faceUri: string): Promise<FaceEmbedding>;

  /**
   * Compare two embeddings directly.
   * Returns cosine similarity (0..1).
   */
  compare(embedding1: number[], embedding2: number[]): number;
}
