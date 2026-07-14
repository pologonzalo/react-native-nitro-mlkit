package com.margelo.nitro.nitromlkit.face

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.tasks.await
import java.io.File
import java.io.FileOutputStream
import java.net.URL
import java.util.UUID
import com.google.mlkit.vision.face.FaceLandmark as MlkitFaceLandmark

/**
 * Native Android implementation of FaceDetector.
 * Extends the Nitrogen-generated HybridFaceDetectorSpec abstract class.
 */
class HybridFaceDetector : HybridFaceDetectorSpec() {

  // MARK: - Lazy MLKit detectors
  // Mirrors the iOS implementation: two fixed detector configs selected by
  // performanceMode. minFaceSize/tracking options are not wired up yet (same
  // limitation as iOS) — coming with a dynamic detector config in a follow-up.

  private val fastDetector by lazy {
    FaceDetection.getClient(
      FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
        .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_NONE)
        .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_NONE)
        .build()
    )
  }

  private val accurateDetector by lazy {
    FaceDetection.getClient(
      FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
        .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
        .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
        .build()
    )
  }

  // MARK: - Spec methods

  override fun detect(imageUri: String, options: FaceDetectionOptions): Promise<Array<DetectedFace>> {
    return Promise.async {
      val bitmap = loadBitmap(imageUri)
        ?: throw Error("Failed to load image: $imageUri")
      val image = InputImage.fromBitmap(bitmap, 0)

      val detector = if (options.performanceMode == PerformanceMode.ACCURATE) accurateDetector else fastDetector
      val mlFaces = detector.process(image).await()

      mlFaces.map { mapFace(it, withLandmarks = options.landmarks) }.toTypedArray()
    }
  }

  override fun detectBatch(imageUris: Array<String>, concurrency: Double): Promise<Array<BatchCropResult>> {
    return Promise.async {
      val maxConcurrent = concurrency.toInt().coerceAtLeast(1)
      val results = mutableListOf<BatchCropResult>()

      var chunkStart = 0
      while (chunkStart < imageUris.size) {
        val chunkEnd = minOf(chunkStart + maxConcurrent, imageUris.size)
        val chunkResults = coroutineScope {
          (chunkStart until chunkEnd).map { idx ->
            async { detectForBatch(idx, imageUris[idx]) }
          }.awaitAll()
        }
        results.addAll(chunkResults)
        chunkStart = chunkEnd
      }
      results.toTypedArray()
    }
  }

  override fun detectPrimary(imageUri: String): Promise<DetectedFace> {
    return Promise.async {
      val bitmap = loadBitmap(imageUri)
        ?: throw Error("Failed to load image: $imageUri")
      val image = InputImage.fromBitmap(bitmap, 0)
      val mlFaces = accurateDetector.process(image).await()

      val largest = mlFaces.maxByOrNull { it.boundingBox.width().toLong() * it.boundingBox.height().toLong() }
        ?: throw Error("No face detected")
      mapFace(largest, withLandmarks = true)
    }
  }

  override fun cropFaces(imageUri: String, padding: Double): Promise<Array<CroppedFace>> {
    return Promise.async {
      val bitmap = loadBitmap(imageUri)
        ?: throw Error("Failed to load image: $imageUri")
      val image = InputImage.fromBitmap(bitmap, 0)
      val mlFaces = fastDetector.process(image).await()

      val imgW = bitmap.width
      val imgH = bitmap.height
      val context = NitroModules.applicationContext
        ?: throw Error("No application context available")
      val crops = mutableListOf<CroppedFace>()

      mlFaces.forEachIndexed { idx, face ->
        val bounds = face.boundingBox
        val padX = (bounds.width() * padding).toInt()
        val padY = (bounds.height() * padding).toInt()

        val x = maxOf(0, bounds.left - padX)
        val y = maxOf(0, bounds.top - padY)
        val w = minOf(imgW - x, bounds.width() + padX * 2)
        val h = minOf(imgH - y, bounds.height() + padY * 2)
        if (w <= 0 || h <= 0) return@forEachIndexed

        val cropped = Bitmap.createBitmap(bitmap, x, y, w, h)
        val tempFile = File(context.cacheDir, "nitro_face_${UUID.randomUUID()}.jpg")
        FileOutputStream(tempFile).use { out ->
          cropped.compress(Bitmap.CompressFormat.JPEG, 80, out)
        }

        crops.add(
          CroppedFace(
            uri = "file://${tempFile.absolutePath}",
            faceIndex = idx.toDouble(),
            width = w.toDouble(),
            height = h.toDouble()
          )
        )
      }
      crops.toTypedArray()
    }
  }

  override fun extractEmbedding(faceUri: String): Promise<DoubleArray> {
    return Promise.async {
      // TODO: Load MobileFaceNet TFLite model and run inference
      throw Error("MobileFaceNet model not yet loaded. Coming in v0.2.0")
    }
  }

  override fun compareFaces(embedding1: DoubleArray, embedding2: DoubleArray): Double {
    // Cosine similarity, normalized to 0..1
    if (embedding1.size != embedding2.size || embedding1.isEmpty()) return 0.0
    var dot = 0.0
    var mag1 = 0.0
    var mag2 = 0.0
    for (i in embedding1.indices) {
      dot += embedding1[i] * embedding2[i]
      mag1 += embedding1[i] * embedding1[i]
      mag2 += embedding2[i] * embedding2[i]
    }
    val denom = kotlin.math.sqrt(mag1) * kotlin.math.sqrt(mag2)
    return if (denom > 0) (dot / denom + 1.0) / 2.0 else 0.0
  }

  override fun extractPrimaryEmbedding(imageUri: String): Promise<DoubleArray> {
    return Promise.async {
      // TODO: detect primary face -> crop -> embed with MobileFaceNet
      throw Error("MobileFaceNet model not yet loaded. Coming in v0.2.0")
    }
  }

  override fun detectAndEmbed(imageUris: Array<String>, concurrency: Double): Promise<Array<BatchEmbeddingResult>> {
    return Promise.async {
      // TODO: batch detect + embed
      throw Error("MobileFaceNet model not yet loaded. Coming in v0.2.0")
    }
  }

  override fun isAvailable(): Boolean {
    return true
  }

  // MARK: - Private helpers

  private suspend fun detectForBatch(idx: Int, uri: String): BatchCropResult {
    return try {
      val bitmap = loadBitmap(uri)
        ?: return BatchCropResult(idx.toDouble(), emptyArray(), emptyArray(), false)
      val image = InputImage.fromBitmap(bitmap, 0)
      val mlFaces = fastDetector.process(image).await()
      val faces = mlFaces.map { mapFace(it, withLandmarks = false) }.toTypedArray()
      BatchCropResult(idx.toDouble(), faces, emptyArray(), true)
    } catch (e: Exception) {
      BatchCropResult(idx.toDouble(), emptyArray(), emptyArray(), false)
    }
  }

  private fun loadBitmap(uri: String): Bitmap? {
    return try {
      when {
        uri.startsWith("file://") -> BitmapFactory.decodeFile(uri.removePrefix("file://"))
        uri.startsWith("/") -> BitmapFactory.decodeFile(uri)
        uri.startsWith("content://") -> {
          val context = NitroModules.applicationContext ?: return null
          context.contentResolver.openInputStream(Uri.parse(uri))?.use { BitmapFactory.decodeStream(it) }
        }
        else -> URL(uri).openStream().use { BitmapFactory.decodeStream(it) }
      }
    } catch (e: Exception) {
      null
    }
  }

  private fun mapFace(face: Face, withLandmarks: Boolean): DetectedFace {
    val landmarks = if (withLandmarks) {
      val pairs = listOf(
        FaceLandmarkType.LEFT_EYE to MlkitFaceLandmark.LEFT_EYE,
        FaceLandmarkType.RIGHT_EYE to MlkitFaceLandmark.RIGHT_EYE,
        FaceLandmarkType.LEFT_EAR to MlkitFaceLandmark.LEFT_EAR,
        FaceLandmarkType.RIGHT_EAR to MlkitFaceLandmark.RIGHT_EAR,
        FaceLandmarkType.LEFT_CHEEK to MlkitFaceLandmark.LEFT_CHEEK,
        FaceLandmarkType.RIGHT_CHEEK to MlkitFaceLandmark.RIGHT_CHEEK,
        FaceLandmarkType.NOSE_BASE to MlkitFaceLandmark.NOSE_BASE,
        FaceLandmarkType.MOUTH_LEFT to MlkitFaceLandmark.MOUTH_LEFT,
        FaceLandmarkType.MOUTH_RIGHT to MlkitFaceLandmark.MOUTH_RIGHT,
        FaceLandmarkType.MOUTH_BOTTOM to MlkitFaceLandmark.MOUTH_BOTTOM
      )
      pairs.mapNotNull { (type, mlType) ->
        face.getLandmark(mlType)?.let { lm ->
          FaceLandmark(type, lm.position.x.toDouble(), lm.position.y.toDouble())
        }
      }.toTypedArray()
    } else {
      emptyArray()
    }

    return DetectedFace(
      bounds = FaceBounds(
        x = face.boundingBox.left.toDouble(),
        y = face.boundingBox.top.toDouble(),
        width = face.boundingBox.width().toDouble(),
        height = face.boundingBox.height().toDouble()
      ),
      headEulerAngleY = face.headEulerAngleY.toDouble(),
      headEulerAngleZ = face.headEulerAngleZ.toDouble(),
      leftEyeOpenProbability = (face.leftEyeOpenProbability ?: -1f).toDouble(),
      rightEyeOpenProbability = (face.rightEyeOpenProbability ?: -1f).toDouble(),
      smilingProbability = (face.smilingProbability ?: -1f).toDouble(),
      landmarks = landmarks,
      trackingId = (face.trackingId ?: -1).toDouble()
    )
  }
}
