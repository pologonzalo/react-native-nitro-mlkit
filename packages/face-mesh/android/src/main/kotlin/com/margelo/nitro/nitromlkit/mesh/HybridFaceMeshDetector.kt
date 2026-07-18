package com.margelo.nitro.nitromlkit.mesh

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.facemesh.FaceMeshDetection
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.tasks.await
import java.net.URL

/**
 * Native Android implementation of FaceMeshDetector (MLKit face mesh).
 * Returns up to 468 3D mesh points for the primary face.
 */
class HybridFaceMeshDetector : HybridFaceMeshDetectorSpec() {

  private val detector by lazy { FaceMeshDetection.getClient() }

  override fun detect(imageUri: String): Promise<Array<MeshPoint>> {
    return Promise.async { detectImage(imageUri) }
  }

  override fun detectBatch(imageUris: Array<String>, concurrency: Double): Promise<Array<BatchMeshResult>> {
    return Promise.async {
      val maxConcurrent = concurrency.toInt().coerceAtLeast(1)
      val results = mutableListOf<BatchMeshResult>()
      var start = 0
      while (start < imageUris.size) {
        val end = minOf(start + maxConcurrent, imageUris.size)
        val chunk = coroutineScope {
          (start until end).map { idx ->
            async {
              try {
                BatchMeshResult(idx.toDouble(), detectImage(imageUris[idx]), true, null)
              } catch (e: Exception) {
                BatchMeshResult(idx.toDouble(), emptyArray(), false, e.message ?: "unknown error")
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

  private suspend fun detectImage(uri: String): Array<MeshPoint> {
    val bitmap = loadBitmap(uri) ?: throw Error("Failed to load image: $uri")
    val image = InputImage.fromBitmap(bitmap, 0)
    val meshes = detector.process(image).await()
    val mesh = meshes.firstOrNull() ?: return emptyArray()
    return mesh.allPoints.map { p ->
      MeshPoint(
        index = p.index.toDouble(),
        x = p.position.x.toDouble(),
        y = p.position.y.toDouble(),
        z = p.position.z.toDouble(),
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
