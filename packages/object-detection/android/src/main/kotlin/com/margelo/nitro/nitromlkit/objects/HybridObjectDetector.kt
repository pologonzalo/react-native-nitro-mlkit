package com.margelo.nitro.nitromlkit.objects

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.objects.ObjectDetection
import com.google.mlkit.vision.objects.defaults.ObjectDetectorOptions
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.tasks.await
import java.net.URL
import com.google.mlkit.vision.objects.DetectedObject as MlkitObject

/**
 * Native Android implementation of ObjectDetector (MLKit object detection).
 * SINGLE_IMAGE_MODE with multiple objects + coarse classification.
 */
class HybridObjectDetector : HybridObjectDetectorSpec() {

  private val detector by lazy {
    ObjectDetection.getClient(
      ObjectDetectorOptions.Builder()
        .setDetectorMode(ObjectDetectorOptions.SINGLE_IMAGE_MODE)
        .enableMultipleObjects()
        .enableClassification()
        .build()
    )
  }

  override fun detect(imageUri: String): Promise<Array<DetectedObject>> {
    return Promise.async { detectImage(imageUri) }
  }

  override fun detectBatch(imageUris: Array<String>, concurrency: Double): Promise<Array<BatchObjectResult>> {
    return Promise.async {
      val maxConcurrent = concurrency.toInt().coerceAtLeast(1)
      val results = mutableListOf<BatchObjectResult>()
      var start = 0
      while (start < imageUris.size) {
        val end = minOf(start + maxConcurrent, imageUris.size)
        val chunk = coroutineScope {
          (start until end).map { idx ->
            async {
              try {
                BatchObjectResult(idx.toDouble(), detectImage(imageUris[idx]), true, null)
              } catch (e: Exception) {
                BatchObjectResult(idx.toDouble(), emptyArray(), false, e.message ?: "unknown error")
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

  private suspend fun detectImage(uri: String): Array<DetectedObject> {
    val bitmap = loadBitmap(uri) ?: throw Error("Failed to load image: $uri")
    val image = InputImage.fromBitmap(bitmap, 0)
    val objects = detector.process(image).await()
    return objects.map { mapObject(it) }.toTypedArray()
  }

  private fun mapObject(o: MlkitObject): DetectedObject {
    val box = o.boundingBox
    val labels = o.labels.map { ObjectLabel(it.text, it.confidence.toDouble(), it.index.toDouble()) }.toTypedArray()
    return DetectedObject(
      bounds = ObjectRect(
        x = box.left.toDouble(),
        y = box.top.toDouble(),
        width = box.width().toDouble(),
        height = box.height().toDouble(),
      ),
      trackingId = (o.trackingId ?: -1).toDouble(),
      labels = labels,
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
