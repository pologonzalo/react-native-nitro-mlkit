package com.margelo.nitro.nitromlkit.docscan

import android.app.Activity
import android.content.Intent
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.tasks.await
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Bridges ML Kit's document-scanner Activity result back to the coroutine that
 * launched it. The Expo module (NitroMLKitDocumentScannerPackage) provides the
 * current Activity and forwards onActivityResult here.
 */
object DocScannerBridge {
  const val REQUEST_CODE = 0xD0C5

  /** Set by the Expo module so we can reach the foreground Activity. */
  var activityProvider: (() -> Activity?)? = null

  private var pending: CancellableContinuation<Intent?>? = null

  fun awaitResult(cont: CancellableContinuation<Intent?>) {
    pending = cont
    cont.invokeOnCancellation { pending = null }
  }

  fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != REQUEST_CODE) return
    val cont = pending ?: return
    pending = null
    if (resultCode == Activity.RESULT_OK) {
      cont.resume(data)
    } else {
      cont.resumeWithException(RuntimeException("Document scan cancelled"))
    }
  }
}

/**
 * Native Android implementation of DocumentScanner (MLKit / Google Play
 * services document scanner). `scan()` launches the full-screen scanner UI and
 * resolves with the captured page image URIs (and optionally a PDF).
 */
class HybridDocumentScanner : HybridDocumentScannerSpec() {

  override fun scan(
    pageLimit: Double,
    includePdf: Boolean,
    allowGalleryImport: Boolean,
  ): Promise<ScannedDocument> {
    return Promise.async {
      val activity = DocScannerBridge.activityProvider?.invoke()
        ?: throw IllegalStateException("No current Activity available to launch the scanner")

      val builder = GmsDocumentScannerOptions.Builder()
        .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)
        .setGalleryImportAllowed(allowGalleryImport)
        .setPageLimit(maxOf(1, pageLimit.toInt()))
      if (includePdf) {
        builder.setResultFormats(
          GmsDocumentScannerOptions.RESULT_FORMAT_JPEG,
          GmsDocumentScannerOptions.RESULT_FORMAT_PDF,
        )
      } else {
        builder.setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
      }

      val scanner = GmsDocumentScanning.getClient(builder.build())
      val intentSender = scanner.getStartScanIntent(activity).await()

      val data = suspendCancellableCoroutine<Intent?> { cont ->
        DocScannerBridge.awaitResult(cont)
        activity.startIntentSenderForResult(
          intentSender,
          DocScannerBridge.REQUEST_CODE,
          null,
          0,
          0,
          0,
        )
      }

      val result = GmsDocumentScanningResult.fromActivityResultIntent(data)
        ?: throw RuntimeException("No document scan result")

      val pages = result.pages?.map { it.imageUri.toString() }?.toTypedArray() ?: emptyArray()
      ScannedDocument(pages, result.pdf?.uri?.toString(), pages.size.toDouble())
    }
  }

  override fun isAvailable(): Boolean = true
}
