package com.margelo.nitro.nitromlkit.langid

import com.google.mlkit.nl.languageid.LanguageIdentification
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.tasks.await

/**
 * Native Android implementation of LanguageIdentifier (MLKit language ID).
 * Text in, BCP-47 tag(s) out — no images involved.
 */
class HybridLanguageIdentifier : HybridLanguageIdentifierSpec() {

  private val client by lazy { LanguageIdentification.getClient() }

  override fun identify(text: String): Promise<String> {
    return Promise.async { client.identifyLanguage(text).await() }
  }

  override fun identifyPossible(text: String): Promise<Array<LanguageMatch>> {
    return Promise.async {
      client.identifyPossibleLanguages(text).await()
        .map { LanguageMatch(it.languageTag, it.confidence.toDouble()) }
        .toTypedArray()
    }
  }

  override fun isAvailable(): Boolean = true
}
