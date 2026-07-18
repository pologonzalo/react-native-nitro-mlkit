package com.margelo.nitro.nitromlkit.subjectseg

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.segmentation.subject.SubjectSegmentation
import com.google.mlkit.vision.segmentation.subject.SubjectSegmenterOptions
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.tasks.await
import java.io.File
import java.io.FileOutputStream
import java.net.URL
import java.util.UUID

/**
 * Native Android implementation of SubjectSegmenter (MLKit Subject Segmentation).
 * Cuts out the main subject(s) of a photo from the background and returns a
 * transparent PNG cutout. Downloads a model at runtime on first use.
 * Android-only — Google ML Kit has no Subject Segmentation API on iOS.
 */
class HybridSubjectSegmenter : HybridSubjectSegmenterSpec() {

  private val client by lazy {
    SubjectSegmentation.getClient(
      SubjectSegmenterOptions.Builder()
        .enableForegroundBitmap()
        .build()
    )
  }

  override fun segment(imageUri: String): Promise<SubjectSegmentationResult> {
    return Promise.async {
      val bitmap = loadBitmap(imageUri) ?: throw IllegalStateException("Failed to load image: $imageUri")
      val input = InputImage.fromBitmap(bitmap, 0)
      val result = client.process(input).await()
      val fg: Bitmap = result.foregroundBitmap
        ?: throw IllegalStateException("No foreground bitmap produced")
      val uri = writePng(fg, "subject")
      SubjectSegmentationResult(
        uri,
        fg.width.toDouble(),
        fg.height.toDouble(),
        result.subjects.size.toDouble(),
      )
    }
  }

  override fun isAvailable(): Boolean = true

  private fun writePng(bitmap: Bitmap, prefix: String): String {
    val context = NitroModules.applicationContext ?: throw IllegalStateException("No application context")
    val tempFile = File(context.cacheDir, "nitro_${prefix}_${UUID.randomUUID()}.png")
    FileOutputStream(tempFile).use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    return "file://${tempFile.absolutePath}"
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
