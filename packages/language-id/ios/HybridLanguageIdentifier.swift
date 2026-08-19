import Foundation
import NitroModules
#if !targetEnvironment(simulator)
import MLKitLanguageID
#endif

/**
 * Native iOS implementation of LanguageIdentifier (MLKit Language ID).
 * Conforms to the Nitrogen-generated HybridLanguageIdentifierSpec protocol.
 *
 * Text in, BCP-47 tag(s) out — no images involved. The MLKit completion-handler
 * APIs are wrapped in `withCheckedThrowingContinuation` so they can be awaited
 * inside `Promise.async`.
 */
class HybridLanguageIdentifier: HybridLanguageIdentifierSpec {

    // MARK: - HybridObject boilerplate
    var memorySize: Int { MemoryLayout<HybridLanguageIdentifier>.size }

    #if targetEnvironment(simulator)

    // MARK: - Simulator stub (no arm64-sim slice from Google ML Kit)
    // Same pattern as @nitro-mlkit/face-detection: ML Kit's vendored frameworks
    // ship no arm64 iOS-Simulator slice, so on simulator we never import or
    // call into MLKit — every method throws a clear error instead. The
    // companion config plugin strips the frameworks from the simulator link.

    private static func simulatorError() -> RuntimeError {
        RuntimeError.error(withMessage: "Language identification isn't available on the iOS Simulator — Google ML Kit ships no arm64 Simulator slice. Run on a physical device.")
    }

    func identify(text: String) throws -> Promise<String> {
        return Promise.async { throw Self.simulatorError() }
    }

    func identifyPossible(text: String) throws -> Promise<[LanguageMatch]> {
        return Promise.async { throw Self.simulatorError() }
    }

    func isAvailable() throws -> Bool{
        return false
    }

    #else


    // MARK: - Lazy MLKit client (default options)
    private lazy var client: LanguageIdentification = LanguageIdentification.languageIdentification()

    // MARK: - Protocol methods

    func identify(text: String) throws -> Promise<String> {
        return Promise.async {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<String, Error>) in
                self.client.identifyLanguage(for: text) { languageTag, error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else {
                        // languageTag is `IdentifiedLanguage.undetermined` ("und") when nothing matched.
                        continuation.resume(returning: languageTag ?? "und")
                    }
                }
            }
        }
    }

    func identifyPossible(text: String) throws -> Promise<[LanguageMatch]> {
        return Promise.async {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<[LanguageMatch], Error>) in
                self.client.identifyPossibleLanguages(for: text) { identifiedLanguages, error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else {
                        let matches = (identifiedLanguages ?? []).map {
                            LanguageMatch(language: $0.languageTag, confidence: Double($0.confidence))
                        }
                        continuation.resume(returning: matches)
                    }
                }
            }
        }
    }

    func isAvailable() throws -> Bool {
        return true
    }

    #endif
}
