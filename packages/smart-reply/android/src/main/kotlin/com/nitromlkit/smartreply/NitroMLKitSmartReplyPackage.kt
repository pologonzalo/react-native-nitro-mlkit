package com.nitromlkit.smartreply

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.margelo.nitro.nitromlkit.smartreply.NitroMLKitSmartReplyOnLoad

/**
 * Loads the native library and registers the SmartReplyGenerator HybridObject at
 * startup via Expo autolinking. Exposes no JS API of its own.
 */
class NitroMLKitSmartReplyPackage : Module() {
  init {
    NitroMLKitSmartReplyOnLoad.initializeNative()
  }

  override fun definition() = ModuleDefinition {
    Name("NitroMLKitSmartReply")
  }
}
