package com.nitromlkit.mesh

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.margelo.nitro.nitromlkit.mesh.NitroMLKitMeshOnLoad

/**
 * Loads the native library and registers the FaceMeshDetector HybridObject at startup via
 * Expo autolinking. Exposes no JS API of its own.
 */
class NitroMLKitMeshPackage : Module() {
  init {
    NitroMLKitMeshOnLoad.initializeNative()
  }

  override fun definition() = ModuleDefinition {
    Name("NitroMLKitMesh")
  }
}
