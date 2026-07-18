import Foundation
import NitroModules
import MLKitCommon
import MLKitTranslate

/**
 * Native iOS implementation of Translator (MLKit on-device Translation).
 * Conforms to the Nitrogen-generated HybridTranslatorSpec protocol.
 *
 * Language codes are BCP-47 (e.g. "en", "es", "fr"). On iOS a BCP-47 tag maps
 * to a `TranslateLanguage` via its `rawValue`. Model downloads go through
 * `ModelManager`, which is notification-based on iOS (unlike the completion /
 * Task-based Android API), so `download(_:conditions:)` is bridged to async via
 * a NotificationCenter observer wrapped in a continuation.
 */
class HybridTranslator: HybridTranslatorSpec {

    // MARK: - HybridObject boilerplate
    var memorySize: Int { MemoryLayout<HybridTranslator>.size }

    // MARK: - Lazy MLKit model manager
    private lazy var modelManager: ModelManager = ModelManager.modelManager()

    // MARK: - Helpers

    /// Convert a BCP-47 tag to a validated `TranslateLanguage`, or throw.
    private func language(for tag: String) throws -> TranslateLanguage {
        let lang = TranslateLanguage(rawValue: tag)
        guard TranslateLanguage.allLanguages().contains(lang) else {
            throw RuntimeError.error(withMessage: "Unsupported language: \(tag)")
        }
        return lang
    }

    /// Bridge the notification-based ML Kit model download to async/await.
    private func awaitModelDownload(_ model: TranslateRemoteModel,
                                    conditions: ModelDownloadConditions) async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            let center = NotificationCenter.default
            var didResume = false
            var successObserver: NSObjectProtocol?
            var failObserver: NSObjectProtocol?

            func cleanup() {
                if let successObserver = successObserver { center.removeObserver(successObserver) }
                if let failObserver = failObserver { center.removeObserver(failObserver) }
            }

            func isForThisModel(_ note: Notification) -> Bool {
                guard let downloaded = note.userInfo?[ModelDownloadUserInfoKey.remoteModel.rawValue] as? NSObject else {
                    return false
                }
                return downloaded.isEqual(model)
            }

            successObserver = center.addObserver(forName: .mlkitModelDownloadDidSucceed,
                                                 object: nil, queue: .main) { note in
                guard !didResume, isForThisModel(note) else { return }
                didResume = true
                cleanup()
                continuation.resume()
            }

            failObserver = center.addObserver(forName: .mlkitModelDownloadDidFail,
                                              object: nil, queue: .main) { note in
                guard !didResume, isForThisModel(note) else { return }
                didResume = true
                cleanup()
                let err = note.userInfo?[ModelDownloadUserInfoKey.error.rawValue] as? Error
                continuation.resume(throwing: err ?? RuntimeError.error(
                    withMessage: "Failed to download translation model: \(model.language.rawValue)"))
            }

            // Kicks off the download; progress is reported via the observed notifications.
            _ = self.modelManager.download(model, conditions: conditions)
        }
    }

    // MARK: - Protocol methods

    func translate(text: String, sourceLanguage: String, targetLanguage: String) throws -> Promise<String> {
        return Promise.async {
            let source = try self.language(for: sourceLanguage)
            let target = try self.language(for: targetLanguage)
            let options = TranslatorOptions(sourceLanguage: source, targetLanguage: target)
            let translator = Translator.translator(options: options)

            // Download the model(s) for this language pair if needed.
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                translator.downloadModelIfNeeded(with: ModelDownloadConditions()) { error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else {
                        continuation.resume()
                    }
                }
            }

            // Translate.
            return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<String, Error>) in
                translator.translate(text) { translatedText, error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else if let translatedText = translatedText {
                        continuation.resume(returning: translatedText)
                    } else {
                        continuation.resume(throwing: RuntimeError.error(withMessage: "Translation returned no result"))
                    }
                }
            }
        }
    }

    func downloadModel(language: String, requireWifi: Bool) throws -> Promise<Void> {
        return Promise.async {
            let lang = try self.language(for: language)
            let model = TranslateRemoteModel.translateRemoteModel(language: lang)
            let conditions = ModelDownloadConditions(allowsCellularAccess: !requireWifi,
                                                     allowsBackgroundDownloading: false)
            try await self.awaitModelDownload(model, conditions: conditions)
        }
    }

    func isModelDownloaded(language: String) throws -> Promise<Bool> {
        return Promise.async {
            let lang = try self.language(for: language)
            let model = TranslateRemoteModel.translateRemoteModel(language: lang)
            // `isModelDownloaded(_:)` is synchronous on iOS.
            return self.modelManager.isModelDownloaded(model)
        }
    }

    func deleteModel(language: String) throws -> Promise<Void> {
        return Promise.async {
            let lang = try self.language(for: language)
            let model = TranslateRemoteModel.translateRemoteModel(language: lang)
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
                self.modelManager.deleteDownloadedModel(model) { error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else {
                        continuation.resume()
                    }
                }
            }
        }
    }

    func getDownloadedModels() throws -> Promise<[String]> {
        return Promise.async {
            // `downloadedTranslateModels` is a Set<TranslateRemoteModel> exposed by
            // MLKitTranslate as a category on ModelManager.
            return self.modelManager.downloadedTranslateModels.map { $0.language.rawValue }
        }
    }

    func isAvailable() throws -> Bool {
        return true
    }
}
