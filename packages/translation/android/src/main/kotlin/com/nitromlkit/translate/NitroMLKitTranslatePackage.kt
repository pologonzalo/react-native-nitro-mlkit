package com.nitromlkit.translate

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.margelo.nitro.nitromlkit.translate.NitroMLKitTranslateOnLoad

/**
 * Loads the native library and registers the Translator HybridObject at startup via
 * Expo autolinking. Exposes no JS API of its own.
 */
class NitroMLKitTranslatePackage : Module() {
  init {
    NitroMLKitTranslateOnLoad.initializeNative()
  }

  override fun definition() = ModuleDefinition {
    Name("NitroMLKitTranslate")
  }
}
