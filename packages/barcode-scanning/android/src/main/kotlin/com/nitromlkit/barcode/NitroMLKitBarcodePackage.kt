package com.nitromlkit.barcode

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.margelo.nitro.nitromlkit.barcode.NitroMLKitBarcodeOnLoad

/**
 * Exists only so Expo's module autolinking instantiates this class at startup,
 * which loads the native library and registers the BarcodeScanner HybridObject
 * with Nitro's HybridObjectRegistry. Exposes no JS API of its own.
 */
class NitroMLKitBarcodePackage : Module() {
  init {
    NitroMLKitBarcodeOnLoad.initializeNative()
  }

  override fun definition() = ModuleDefinition {
    Name("NitroMLKitBarcode")
  }
}
