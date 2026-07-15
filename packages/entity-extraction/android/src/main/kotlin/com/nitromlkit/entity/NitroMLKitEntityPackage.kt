package com.nitromlkit.entity

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.margelo.nitro.nitromlkit.entity.NitroMLKitEntityOnLoad

/**
 * Loads the native library and registers the EntityExtractor HybridObject at
 * startup via Expo autolinking. Exposes no JS API of its own.
 */
class NitroMLKitEntityPackage : Module() {
  init {
    NitroMLKitEntityOnLoad.initializeNative()
  }

  override fun definition() = ModuleDefinition {
    Name("NitroMLKitEntity")
  }
}
