package com.margelo.nitro.nitromlkit.selfieseg

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.segmentation.Segmentation
import com.google.mlkit.vision.segmentation.SegmentationMask
import com.google.mlkit.vision.segmentation.selfie.SelfieSegmenterOptions
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

/**
 * Native Android implementation of SelfieSegmenter (MLKit selfie segmentation).
 * Produces a foreground-confidence mask as a PNG (alpha = confidence).
 */
class HybridSelfieSegmenter : HybridSelfieSegmenterSpec() {

  private val segmenter by lazy {
    Segmentation.getClient(
      SelfieSegmenterOptions.Builder()
        .setDetectorMode(SelfieSegmenterOptions.SINGLE_IMAGE_MODE)
        .build()
    )
  }

  override fun segment(imageUri: String): Promise<SegmentationResult> {
    return Promise.async { segmentImage(imageUri) }
  }

  override fun segmentBatch(imageUris: Array<String>, concurrency: Double): Promise<Array<BatchSegmentationResult>> {
    return Promise.async {
      val maxConcurrent = concurrency.toInt().coerceAtLeast(1)
      val results = mutableListOf<BatchSegmentationResult>()
      var start = 0
      while (start < imageUris.size) {
        val end = minOf(start + maxConcurrent, imageUris.size)
        val chunk = coroutineScope {
          (start until end).map { idx ->
            async {
              try {
                BatchSegmentationResult(idx.toDouble(), segmentImage(imageUris[idx]), true, null)
              } catch (e: Exception) {
                BatchSegmentationResult(
                  idx.toDouble(),
                  SegmentationResult("", 0.0, 0.0, 0.0),
                  false,
                  e.message ?: "unknown error",
                )
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

  override fun isAvailable(): Boolean = true

  private suspend fun segmentImage(uri: String): SegmentationResult {
    val bitmap = loadBitmap(uri) ?: throw Error("Failed to load image: $uri")
    val image = InputImage.fromBitmap(bitmap, 0)
    val mask: SegmentationMask = segmenter.process(image).await()
    val context = NitroModules.applicationContext ?: throw Error("No application context")

    val w = mask.width
    val h = mask.height
    val buffer = mask.buffer
    buffer.rewind()

    val pixels = IntArray(w * h)
    var foreground = 0
    for (i in 0 until w * h) {
      val conf = buffer.float
      if (conf > 0.5f) foreground++
      val a = (conf * 255f).toInt().coerceIn(0, 255)
      // White pixel, alpha = foreground confidence.
      pixels[i] = (a shl 24) or 0x00FFFFFF
    }

    val bmp = Bitmap.createBitmap(pixels, w, h, Bitmap.Config.ARGB_8888)
    val tempFile = File(context.cacheDir, "nitro_selfie_${UUID.randomUUID()}.png")
    FileOutputStream(tempFile).use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }

    return SegmentationResult(
      maskUri = "file://${tempFile.absolutePath}",
      width = w.toDouble(),
      height = h.toDouble(),
      foregroundRatio = if (w * h > 0) foreground.toDouble() / (w * h) else 0.0,
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
}
