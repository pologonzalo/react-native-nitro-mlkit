package com.margelo.nitro.nitromlkit.labeling

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.tasks.await
import java.net.URL

/**
 * Native Android implementation of ImageLabeler.
 * Extends the Nitrogen-generated HybridImageLabelerSpec abstract class.
 *
 * Uses MLKit's bundled on-device image-labeling model (400+ general labels).
 * The confidenceThreshold / maxLabels options are applied in Kotlin so callers
 * can tune them per-call without rebuilding the model.
 */
class HybridImageLabeler : HybridImageLabelerSpec() {

  // A single client with the threshold floored to 0, so per-call thresholds can
  // filter down in code. Reused across calls (the model loads once).
  private val labeler by lazy {
    ImageLabeling.getClient(
      ImageLabelerOptions.Builder()
        .setConfidenceThreshold(0.0f)
        .build()
    )
  }

  // MARK: - Spec methods

  override fun label(imageUri: String, options: LabelingOptions?): Promise<Array<ImageLabel>> {
    return Promise.async {
      labelImage(
        imageUri,
        threshold = options?.confidenceThreshold ?: DEFAULT_THRESHOLD,
        maxLabels = options?.maxLabels?.toInt() ?: DEFAULT_MAX_LABELS,
      )
    }
  }

  override fun labelBatch(imageUris: Array<String>, options: BatchLabelOptions?): Promise<Array<BatchLabelResult>> {
    return Promise.async {
      val threshold = options?.confidenceThreshold ?: DEFAULT_THRESHOLD
      val maxLabels = options?.maxLabels?.toInt() ?: DEFAULT_MAX_LABELS
      val concurrency = options?.concurrency?.toInt()?.coerceAtLeast(1) ?: DEFAULT_CONCURRENCY

      val results = mutableListOf<BatchLabelResult>()
      var start = 0
      while (start < imageUris.size) {
        val end = minOf(start + concurrency, imageUris.size)
        val chunk = coroutineScope {
          (start until end).map { idx ->
            async {
              try {
                BatchLabelResult(idx.toDouble(), labelImage(imageUris[idx], threshold, maxLabels), true, null)
              } catch (e: Exception) {
                BatchLabelResult(idx.toDouble(), emptyArray(), false, e.message ?: "unknown error")
              }
            }
          }.awaitAll()
        }
        results.addAll(chunk)
        start = end
      }
      results.toTypedArray()
    }
  }

  override fun checkSafety(imageUri: String): Promise<SafetyResult> {
    return Promise.async {
      buildSafety(labelImage(imageUri, threshold = 0.0, maxLabels = Int.MAX_VALUE))
    }
  }

  override fun checkSafetyBatch(imageUris: Array<String>, options: BatchSafetyOptions?): Promise<Array<SafetyResult>> {
    return Promise.async {
      val concurrency = options?.concurrency?.toInt()?.coerceAtLeast(1) ?: DEFAULT_CONCURRENCY

      val results = mutableListOf<SafetyResult>()
      var start = 0
      while (start < imageUris.size) {
        val end = minOf(start + concurrency, imageUris.size)
        val chunk = coroutineScope {
          (start until end).map { idx ->
            async {
              try {
                buildSafety(labelImage(imageUris[idx], threshold = 0.0, maxLabels = Int.MAX_VALUE))
              } catch (e: Exception) {
                // Fail open: an unreadable image is not "unsafe".
                SafetyResult(true, emptyArray(), 1.0)
              }
            }
          }.awaitAll()
        }
        results.addAll(chunk)
        start = end
      }
      results.toTypedArray()
    }
  }

  override fun matchCategories(imageUri: String, categories: Array<String>): Promise<Array<ImageLabel>> {
    return Promise.async {
      val wanted = categories.map { it.lowercase() }.toSet()
      labelImage(imageUri, threshold = 0.0, maxLabels = Int.MAX_VALUE)
        .filter { it.text.lowercase() in wanted }
        .toTypedArray()
    }
  }

  override fun isAvailable(): Boolean = true

  // MARK: - Private helpers

  private suspend fun labelImage(uri: String, threshold: Double, maxLabels: Int): Array<ImageLabel> {
    val bitmap = loadBitmap(uri) ?: throw Error("Failed to load image: $uri")
    val image = InputImage.fromBitmap(bitmap, 0)
    val mlLabels = labeler.process(image).await()
    return mlLabels
      .filter { it.confidence >= threshold }
      .sortedByDescending { it.confidence }
      .take(maxLabels)
      .map { ImageLabel(it.text, it.confidence.toDouble(), it.index.toDouble()) }
      .toTypedArray()
  }

  private fun buildSafety(labels: Array<ImageLabel>): SafetyResult {
    // Heuristic only: MLKit's general label set is NOT a trained NSFW classifier.
    val unsafe = labels.filter { it.text.lowercase() in UNSAFE_KEYWORDS && it.confidence >= UNSAFE_MIN_CONFIDENCE }
    val maxUnsafeConf = unsafe.maxOfOrNull { it.confidence } ?: 0.0
    return SafetyResult(
      safe = unsafe.isEmpty(),
      unsafeLabels = unsafe.map { it.text }.toTypedArray(),
      safetyScore = 1.0 - maxUnsafeConf,
    )
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

  companion object {
    private const val DEFAULT_THRESHOLD = 0.5
    private const val DEFAULT_MAX_LABELS = 10
    private const val DEFAULT_CONCURRENCY = 4
    private const val UNSAFE_MIN_CONFIDENCE = 0.5

    // Best-effort keyword heuristic for checkSafety(); see buildSafety().
    private val UNSAFE_KEYWORDS = setOf(
      "brassiere", "lingerie", "underwear", "swimwear", "bikini",
      "abdomen", "navel", "thigh", "flesh",
      "blood", "weapon", "knife", "gun", "rifle",
    )
  }
}
