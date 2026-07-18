package com.margelo.nitro.nitromlkit.barcode

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.tasks.await
import java.net.URL
import com.google.mlkit.vision.barcode.common.Barcode as MlkitBarcode

/**
 * Native Android implementation of BarcodeScanner.
 * Extends the Nitrogen-generated HybridBarcodeScannerSpec abstract class.
 *
 * Uses MLKit's bundled barcode-scanning model (all 1D/2D symbologies).
 */
class HybridBarcodeScanner : HybridBarcodeScannerSpec() {

  // Default client detects all supported formats; reused across calls.
  private val scanner by lazy { BarcodeScanning.getClient() }

  // MARK: - Spec methods

  override fun scan(imageUri: String): Promise<Array<Barcode>> {
    return Promise.async { scanImage(imageUri) }
  }

  override fun scanFirst(imageUri: String): Promise<Barcode?> {
    return Promise.async { scanImage(imageUri).firstOrNull() }
  }

  override fun scanBatch(imageUris: Array<String>, concurrency: Double): Promise<Array<BatchScanResult>> {
    return Promise.async {
      val maxConcurrent = concurrency.toInt().coerceAtLeast(1)
      val results = mutableListOf<BatchScanResult>()
      var start = 0
      while (start < imageUris.size) {
        val end = minOf(start + maxConcurrent, imageUris.size)
        val chunk = coroutineScope {
          (start until end).map { idx ->
            async {
              try {
                BatchScanResult(idx.toDouble(), scanImage(imageUris[idx]), true, null)
              } catch (e: Exception) {
                BatchScanResult(idx.toDouble(), emptyArray(), false, e.message ?: "unknown error")
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

  private suspend fun scanImage(uri: String): Array<Barcode> {
    val bitmap = loadBitmap(uri) ?: throw Error("Failed to load image: $uri")
    val image = InputImage.fromBitmap(bitmap, 0)
    val barcodes = scanner.process(image).await()
    return barcodes.map { mapBarcode(it) }.toTypedArray()
  }

  private fun mapBarcode(b: MlkitBarcode): Barcode {
    val box = b.boundingBox
    val raw = b.rawValue ?: ""
    return Barcode(
      rawValue = raw,
      displayValue = b.displayValue ?: raw,
      format = formatName(b.format),
      valueType = valueTypeName(b.valueType),
      bounds = BarcodeBounds(
        x = (box?.left ?: 0).toDouble(),
        y = (box?.top ?: 0).toDouble(),
        width = (box?.width() ?: 0).toDouble(),
        height = (box?.height() ?: 0).toDouble(),
      ),
    )
  }

  private fun formatName(format: Int): String = when (format) {
    MlkitBarcode.FORMAT_CODE_128 -> "CODE_128"
    MlkitBarcode.FORMAT_CODE_39 -> "CODE_39"
    MlkitBarcode.FORMAT_CODE_93 -> "CODE_93"
    MlkitBarcode.FORMAT_CODABAR -> "CODABAR"
    MlkitBarcode.FORMAT_DATA_MATRIX -> "DATA_MATRIX"
    MlkitBarcode.FORMAT_EAN_13 -> "EAN_13"
    MlkitBarcode.FORMAT_EAN_8 -> "EAN_8"
    MlkitBarcode.FORMAT_ITF -> "ITF"
    MlkitBarcode.FORMAT_QR_CODE -> "QR_CODE"
    MlkitBarcode.FORMAT_UPC_A -> "UPC_A"
    MlkitBarcode.FORMAT_UPC_E -> "UPC_E"
    MlkitBarcode.FORMAT_PDF417 -> "PDF417"
    MlkitBarcode.FORMAT_AZTEC -> "AZTEC"
    else -> "UNKNOWN"
  }

  private fun valueTypeName(type: Int): String = when (type) {
    MlkitBarcode.TYPE_CONTACT_INFO -> "CONTACT_INFO"
    MlkitBarcode.TYPE_EMAIL -> "EMAIL"
    MlkitBarcode.TYPE_ISBN -> "ISBN"
    MlkitBarcode.TYPE_PHONE -> "PHONE"
    MlkitBarcode.TYPE_PRODUCT -> "PRODUCT"
    MlkitBarcode.TYPE_SMS -> "SMS"
    MlkitBarcode.TYPE_TEXT -> "TEXT"
    MlkitBarcode.TYPE_URL -> "URL"
    MlkitBarcode.TYPE_WIFI -> "WIFI"
    MlkitBarcode.TYPE_GEO -> "GEO"
    MlkitBarcode.TYPE_CALENDAR_EVENT -> "CALENDAR_EVENT"
    MlkitBarcode.TYPE_DRIVER_LICENSE -> "DRIVER_LICENSE"
    else -> "UNKNOWN"
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
