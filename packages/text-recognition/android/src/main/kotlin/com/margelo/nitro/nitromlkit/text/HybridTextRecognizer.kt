package com.margelo.nitro.nitromlkit.text

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Rect
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.tasks.await
import java.net.URL

/**
 * Native Android implementation of TextRecognizer.
 * Extends the Nitrogen-generated HybridTextRecognizerSpec abstract class.
 *
 * Uses MLKit's bundled Latin text-recognition model. Returns the full text plus
 * a structured block -> line -> element hierarchy with bounding boxes.
 */
class HybridTextRecognizer : HybridTextRecognizerSpec() {

  private val recognizer by lazy {
    TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
  }

  // MARK: - Spec methods

  override fun recognize(imageUri: String): Promise<RecognizedText> {
    return Promise.async { recognizeImage(imageUri) }
  }

  override fun recognizeText(imageUri: String): Promise<String> {
    return Promise.async { recognizeImage(imageUri).text }
  }

  override fun recognizeBatch(imageUris: Array<String>, concurrency: Double): Promise<Array<BatchTextResult>> {
    return Promise.async {
      val maxConcurrent = concurrency.toInt().coerceAtLeast(1)
      val results = mutableListOf<BatchTextResult>()
      var start = 0
      while (start < imageUris.size) {
        val end = minOf(start + maxConcurrent, imageUris.size)
        val chunk = coroutineScope {
          (start until end).map { idx ->
            async {
              try {
                BatchTextResult(idx.toDouble(), recognizeImage(imageUris[idx]), true, null)
              } catch (e: Exception) {
                BatchTextResult(
                  idx.toDouble(),
                  RecognizedText("", emptyArray()),
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

  // MARK: - Private helpers

  private suspend fun recognizeImage(uri: String): RecognizedText {
    val bitmap = loadBitmap(uri) ?: throw Error("Failed to load image: $uri")
    val image = InputImage.fromBitmap(bitmap, 0)
    return mapText(recognizer.process(image).await())
  }

  private fun rect(box: Rect?): TextRect = TextRect(
    x = (box?.left ?: 0).toDouble(),
    y = (box?.top ?: 0).toDouble(),
    width = (box?.width() ?: 0).toDouble(),
    height = (box?.height() ?: 0).toDouble(),
  )

  private fun mapText(t: Text): RecognizedText {
    val blocks = t.textBlocks.map { b ->
      val lines = b.lines.map { l ->
        val elements = l.elements.map { e -> TextElement(e.text, rect(e.boundingBox)) }.toTypedArray()
        TextLine(l.text, rect(l.boundingBox), elements)
      }.toTypedArray()
      TextBlock(b.text, rect(b.boundingBox), lines)
    }.toTypedArray()
    return RecognizedText(t.text, blocks)
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
