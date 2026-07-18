package com.nitromlkit.text

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.margelo.nitro.nitromlkit.text.NitroMLKitTextOnLoad

/**
 * Exists only so Expo's module autolinking instantiates this class at startup,
 * which loads the native library and registers the TextRecognizer HybridObject
 * with Nitro's HybridObjectRegistry. Exposes no JS API of its own.
 */
class NitroMLKitTextPackage : Module() {
  init {
    NitroMLKitTextOnLoad.initializeNative()
  }

  override fun definition() = ModuleDefinition {
    Name("NitroMLKitText")
  }
}
