package com.nitromlkit.recognition

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.margelo.nitro.nitromlkit.recognition.NitroMLKitRecognitionOnLoad

/**
 * Loads the native library and registers the FaceRecognizer HybridObject at
 * startup via Expo autolinking. Exposes no JS API of its own.
 */
class NitroMLKitRecognitionPackage : Module() {
  init {
    NitroMLKitRecognitionOnLoad.initializeNative()
  }

  override fun definition() = ModuleDefinition {
    Name("NitroMLKitRecognition")
  }
}
