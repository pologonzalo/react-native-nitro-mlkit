package com.margelo.nitro.nitromlkit.translate

import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.TranslateRemoteModel
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslatorOptions
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.tasks.await

class HybridTranslator : HybridTranslatorSpec() {
  private val modelManager by lazy { RemoteModelManager.getInstance() }

  private fun lang(tag: String): String =
    TranslateLanguage.fromLanguageTag(tag)
      ?: throw IllegalArgumentException("Unsupported language: $tag")

  override fun translate(text: String, sourceLanguage: String, targetLanguage: String): Promise<String> {
    return Promise.async {
      val options = TranslatorOptions.Builder()
        .setSourceLanguage(lang(sourceLanguage))
        .setTargetLanguage(lang(targetLanguage))
        .build()
      val client = Translation.getClient(options)
      try {
        client.downloadModelIfNeeded().await()
        client.translate(text).await()
      } finally {
        client.close()
      }
    }
  }

  override fun downloadModel(language: String, requireWifi: Boolean): Promise<Unit> {
    return Promise.async {
      val model = TranslateRemoteModel.Builder(lang(language)).build()
      val conditions = DownloadConditions.Builder().apply { if (requireWifi) requireWifi() }.build()
      modelManager.download(model, conditions).await()
      Unit
    }
  }

  override fun isModelDownloaded(language: String): Promise<Boolean> {
    return Promise.async {
      val model = TranslateRemoteModel.Builder(lang(language)).build()
      modelManager.isModelDownloaded(model).await()
    }
  }

  override fun deleteModel(language: String): Promise<Unit> {
    return Promise.async {
      val model = TranslateRemoteModel.Builder(lang(language)).build()
      modelManager.deleteDownloadedModel(model).await()
      Unit
    }
  }

  override fun getDownloadedModels(): Promise<Array<String>> {
    return Promise.async {
      modelManager.getDownloadedModels(TranslateRemoteModel::class.java).await()
        .map { it.language }.toTypedArray()
    }
  }

  override fun isAvailable(): Boolean = true
}
