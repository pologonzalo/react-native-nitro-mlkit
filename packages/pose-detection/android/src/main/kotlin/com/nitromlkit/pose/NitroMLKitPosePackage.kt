package com.nitromlkit.pose

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.margelo.nitro.nitromlkit.pose.NitroMLKitPoseOnLoad

/**
 * Loads the native library and registers the PoseDetector HybridObject at startup via
 * Expo autolinking. Exposes no JS API of its own.
 */
class NitroMLKitPosePackage : Module() {
  init {
    NitroMLKitPoseOnLoad.initializeNative()
  }

  override fun definition() = ModuleDefinition {
    Name("NitroMLKitPose")
  }
}
