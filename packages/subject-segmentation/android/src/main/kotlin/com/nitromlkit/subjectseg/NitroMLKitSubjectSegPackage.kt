package com.nitromlkit.subjectseg

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.margelo.nitro.nitromlkit.subjectseg.NitroMLKitSubjectSegOnLoad

/**
 * Loads the native library and registers the SubjectSegmenter HybridObject at
 * startup via Expo autolinking. Exposes no JS API of its own.
 */
class NitroMLKitSubjectSegPackage : Module() {
  init {
    NitroMLKitSubjectSegOnLoad.initializeNative()
  }

  override fun definition() = ModuleDefinition {
    Name("NitroMLKitSubjectSeg")
  }
}
