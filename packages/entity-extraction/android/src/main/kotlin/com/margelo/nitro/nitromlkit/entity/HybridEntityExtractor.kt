package com.margelo.nitro.nitromlkit.entity

import com.google.mlkit.nl.entityextraction.Entity
import com.google.mlkit.nl.entityextraction.EntityExtraction
import com.google.mlkit.nl.entityextraction.EntityExtractorOptions
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.tasks.await

/**
 * Native Android implementation of EntityExtractor (MLKit Entity Extraction).
 * Text goes in; the actionable entities found within it (phones, emails,
 * addresses, dates, money, tracking numbers, ...) come out. English model by
 * default, downloaded on first use. All on-device — no images involved.
 */
class HybridEntityExtractor : HybridEntityExtractorSpec() {

  private val client by lazy {
    EntityExtraction.getClient(
      EntityExtractorOptions.Builder(EntityExtractorOptions.ENGLISH).build()
    )
  }

  private fun typeName(type: Int): String = when (type) {
    Entity.TYPE_ADDRESS -> "address"
    Entity.TYPE_DATE_TIME -> "date_time"
    Entity.TYPE_EMAIL -> "email"
    Entity.TYPE_FLIGHT_NUMBER -> "flight_number"
    Entity.TYPE_IBAN -> "iban"
    Entity.TYPE_ISBN -> "isbn"
    Entity.TYPE_MONEY -> "money"
    Entity.TYPE_PAYMENT_CARD -> "payment_card"
    Entity.TYPE_PHONE -> "phone"
    Entity.TYPE_TRACKING_NUMBER -> "tracking_number"
    Entity.TYPE_URL -> "url"
    else -> "unknown"
  }

  override fun annotate(text: String): Promise<Array<DetectedEntity>> {
    return Promise.async {
      client.downloadModelIfNeeded().await()
      val annotations = client.annotate(text).await()
      annotations.map { ann ->
        val type = ann.entities.firstOrNull()?.type ?: -1
        DetectedEntity(
          typeName(type),
          ann.annotatedText,
          ann.start.toDouble(),
          ann.end.toDouble()
        )
      }.toTypedArray()
    }
  }

  override fun isAvailable(): Boolean = true
}
