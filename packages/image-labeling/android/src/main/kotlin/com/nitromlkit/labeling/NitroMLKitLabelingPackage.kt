package com.nitromlkit.labeling

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.margelo.nitro.nitromlkit.labeling.NitroMLKitLabelingOnLoad

/**
 * Exists only so Expo's module autolinking instantiates this class at startup,
 * which loads the native library and registers the ImageLabeler HybridObject
 * with Nitro's HybridObjectRegistry. Exposes no JS API of its own.
 */
class NitroMLKitLabelingPackage : Module() {
  init {
    NitroMLKitLabelingOnLoad.initializeNative()
  }

  override fun definition() = ModuleDefinition {
    Name("NitroMLKitLabeling")
  }
}
