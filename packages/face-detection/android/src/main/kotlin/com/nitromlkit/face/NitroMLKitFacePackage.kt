package com.nitromlkit.face

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.margelo.nitro.nitromlkit.face.NitroMLKitFaceOnLoad

/**
 * Exists only so Expo's module autolinking instantiates this class at startup,
 * which loads the native library and registers the FaceDetector HybridObject
 * with Nitro's HybridObjectRegistry. Exposes no JS API of its own.
 */
class NitroMLKitFacePackage : Module() {
  init {
    NitroMLKitFaceOnLoad.initializeNative()
  }

  override fun definition() = ModuleDefinition {
    Name("NitroMLKitFace")
  }
}
