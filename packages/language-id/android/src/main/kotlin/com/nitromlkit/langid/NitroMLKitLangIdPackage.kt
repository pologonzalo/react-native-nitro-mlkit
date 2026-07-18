package com.nitromlkit.langid

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.margelo.nitro.nitromlkit.langid.NitroMLKitLangIdOnLoad

/**
 * Loads the native library and registers the LanguageIdentifier HybridObject at startup via
 * Expo autolinking. Exposes no JS API of its own.
 */
class NitroMLKitLangIdPackage : Module() {
  init {
    NitroMLKitLangIdOnLoad.initializeNative()
  }

  override fun definition() = ModuleDefinition {
    Name("NitroMLKitLangId")
  }
}
