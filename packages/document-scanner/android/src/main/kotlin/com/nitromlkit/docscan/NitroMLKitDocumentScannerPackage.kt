package com.nitromlkit.docscan

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.margelo.nitro.nitromlkit.docscan.DocScannerBridge
import com.margelo.nitro.nitromlkit.docscan.NitroMLKitDocumentScannerOnLoad

/**
 * Loads the native library and registers the DocumentScanner HybridObject at
 * startup via Expo autolinking. Also supplies the current Activity and forwards
 * the scanner's onActivityResult back to the native bridge (Nitro HybridObjects
 * have no Activity access of their own).
 */
class NitroMLKitDocumentScannerPackage : Module() {
  init {
    NitroMLKitDocumentScannerOnLoad.initializeNative()
  }

  override fun definition() = ModuleDefinition {
    Name("NitroMLKitDocumentScanner")

    OnCreate {
      DocScannerBridge.activityProvider = { appContext.currentActivity }
    }

    OnActivityResult { _, payload ->
      DocScannerBridge.onActivityResult(payload.requestCode, payload.resultCode, payload.data)
    }
  }
}
