package com.margelo.nitro.nitromlkit.pose

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.defaults.PoseDetectorOptions
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.tasks.await
import java.net.URL
import com.google.mlkit.vision.pose.PoseLandmark as MlkitLandmark

/**
 * Native Android implementation of PoseDetector (MLKit pose detection).
 * Returns the 33 skeletal landmarks of the primary body in SINGLE_IMAGE_MODE.
 */
class HybridPoseDetector : HybridPoseDetectorSpec() {

  private val detector by lazy {
    PoseDetection.getClient(
      PoseDetectorOptions.Builder()
        .setDetectorMode(PoseDetectorOptions.SINGLE_IMAGE_MODE)
        .build()
    )
  }

  override fun detect(imageUri: String): Promise<Array<PoseLandmark>> {
    return Promise.async { detectImage(imageUri) }
  }

  override fun detectBatch(imageUris: Array<String>, concurrency: Double): Promise<Array<BatchPoseResult>> {
    return Promise.async {
      val maxConcurrent = concurrency.toInt().coerceAtLeast(1)
      val results = mutableListOf<BatchPoseResult>()
      var start = 0
      while (start < imageUris.size) {
        val end = minOf(start + maxConcurrent, imageUris.size)
        val chunk = coroutineScope {
          (start until end).map { idx ->
            async {
              try {
                BatchPoseResult(idx.toDouble(), detectImage(imageUris[idx]), true, null)
              } catch (e: Exception) {
                BatchPoseResult(idx.toDouble(), emptyArray(), false, e.message ?: "unknown error")
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

  private suspend fun detectImage(uri: String): Array<PoseLandmark> {
    val bitmap = loadBitmap(uri) ?: throw Error("Failed to load image: $uri")
    val image = InputImage.fromBitmap(bitmap, 0)
    val pose = detector.process(image).await()
    return pose.allPoseLandmarks.map { lm ->
      PoseLandmark(
        type = lm.landmarkType.toDouble(),
        x = lm.position3D.x.toDouble(),
        y = lm.position3D.y.toDouble(),
        z = lm.position3D.z.toDouble(),
        inFrameLikelihood = lm.inFrameLikelihood.toDouble(),
      )
    }.toTypedArray()
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
