package com.nitromlkit.objects

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.margelo.nitro.nitromlkit.objects.NitroMLKitObjectsOnLoad

/**
 * Loads the native library and registers the ObjectDetector HybridObject at startup via
 * Expo autolinking. Exposes no JS API of its own.
 */
class NitroMLKitObjectsPackage : Module() {
  init {
    NitroMLKitObjectsOnLoad.initializeNative()
  }

  override fun definition() = ModuleDefinition {
    Name("NitroMLKitObjects")
  }
}
