package com.nitromlkit.selfieseg

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.margelo.nitro.nitromlkit.selfieseg.NitroMLKitSelfieSegOnLoad

/**
 * Loads the native library and registers the SelfieSegmenter HybridObject at startup via
 * Expo autolinking. Exposes no JS API of its own.
 */
class NitroMLKitSelfieSegPackage : Module() {
  init {
    NitroMLKitSelfieSegOnLoad.initializeNative()
  }

  override fun definition() = ModuleDefinition {
    Name("NitroMLKitSelfieSeg")
  }
}
