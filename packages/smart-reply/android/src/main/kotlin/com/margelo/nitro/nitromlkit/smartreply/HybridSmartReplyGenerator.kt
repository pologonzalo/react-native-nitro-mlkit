package com.margelo.nitro.nitromlkit.smartreply

import com.google.mlkit.nl.smartreply.SmartReply
import com.google.mlkit.nl.smartreply.SmartReplySuggestionResult
import com.google.mlkit.nl.smartreply.TextMessage
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.tasks.await

/**
 * Native Android implementation of SmartReplyGenerator (MLKit Smart Reply).
 * A conversation history goes in; up to 3 suggested replies for the local user
 * come out. Text only, English only, all on-device — no images involved.
 */
class HybridSmartReplyGenerator : HybridSmartReplyGeneratorSpec() {

  private val client by lazy { SmartReply.getClient() }

  override fun suggestReplies(conversation: Array<ConversationMessage>): Promise<SmartReplyResult> {
    return Promise.async {
      val messages = conversation.map { msg ->
        val ts = msg.timestamp.toLong()
        if (msg.isLocalUser) {
          TextMessage.createForLocalUser(msg.text, ts)
        } else {
          TextMessage.createForRemoteUser(msg.text, ts, msg.userId ?: "remote")
        }
      }

      val result = client.suggestReplies(messages).await()

      val status = when (result.status) {
        SmartReplySuggestionResult.STATUS_SUCCESS -> SmartReplyStatus.SUCCESS
        SmartReplySuggestionResult.STATUS_NOT_SUPPORTED_LANGUAGE ->
          SmartReplyStatus.NOT_SUPPORTED_LANGUAGE
        else -> SmartReplyStatus.NO_REPLY
      }

      val suggestions =
        if (status == SmartReplyStatus.SUCCESS)
          result.suggestions.map { it.text }.toTypedArray()
        else
          emptyArray()

      SmartReplyResult(status, suggestions)
    }
  }

  override fun isAvailable(): Boolean = true
}
