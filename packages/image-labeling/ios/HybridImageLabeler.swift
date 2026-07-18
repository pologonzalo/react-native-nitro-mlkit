import Foundation
import UIKit
import NitroModules
import MLKitImageLabeling
import MLKitVision

/**
 * Native iOS implementation of ImageLabeler.
 * Conforms to the Nitrogen-generated HybridImageLabelerSpec protocol.
 *
 * Uses MLKit's bundled on-device image-labeling model (400+ general labels).
 * The confidenceThreshold / maxLabels options are applied in Swift so callers
 * can tune them per-call without rebuilding the model. Mirrors the Android
 * (Kotlin) implementation.
 */
class HybridImageLabeler: HybridImageLabelerSpec {

    // MARK: - HybridObject boilerplate
    var memorySize: Int { MemoryLayout<HybridImageLabeler>.size }

    // MARK: - Defaults (match Kotlin companion object)
    private static let defaultThreshold = 0.5
    private static let defaultMaxLabels = 10
    private static let defaultConcurrency = 4
    private static let unsafeMinConfidence = 0.5

    // Best-effort keyword heuristic for checkSafety(); see buildSafety().
    private static let unsafeKeywords: Set<String> = [
        "brassiere", "lingerie", "underwear", "swimwear", "bikini",
        "abdomen", "navel", "thigh", "flesh",
        "blood", "weapon", "knife", "gun", "rifle",
    ]

    // Threshold floored to 0 so per-call thresholds can filter in code.
    // Reused across calls (the model loads once).
    private lazy var labeler: ImageLabeler = {
        let opts = ImageLabelerOptions()
        opts.confidenceThreshold = 0.0
        return ImageLabeler.imageLabeler(options: opts)
    }()

    // MARK: - Spec methods

    func label(imageUri: String, options: LabelingOptions?) throws -> Promise<[ImageLabel]> {
        return Promise.async {
            let threshold = (options?.confidenceThreshold) ?? Self.defaultThreshold
            let maxLabels = (options?.maxLabels).map { Int($0) } ?? Self.defaultMaxLabels
            return try await self.labelImage(imageUri, threshold: threshold, maxLabels: maxLabels)
        }
    }

    func labelBatch(imageUris: [String], options: BatchLabelOptions?) throws -> Promise<[BatchLabelResult]> {
        return Promise.async {
            let threshold = (options?.confidenceThreshold) ?? Self.defaultThreshold
            let maxLabels = (options?.maxLabels).map { Int($0) } ?? Self.defaultMaxLabels
            let concurrency = max(1, (options?.concurrency).map { Int($0) } ?? Self.defaultConcurrency)

            var results = [BatchLabelResult]()
            results.reserveCapacity(imageUris.count)

            for chunkStart in stride(from: 0, to: imageUris.count, by: concurrency) {
                let chunkEnd = min(chunkStart + concurrency, imageUris.count)
                let chunk = Array(imageUris[chunkStart..<chunkEnd])

                let chunkResults = await withTaskGroup(of: (Int, BatchLabelResult).self) { group in
                    for (i, uri) in chunk.enumerated() {
                        let globalIdx = chunkStart + i
                        group.addTask {
                            do {
                                let labels = try await self.labelImage(uri, threshold: threshold, maxLabels: maxLabels)
                                return (globalIdx, BatchLabelResult(index: Double(globalIdx), labels: labels, success: true, error: nil))
                            } catch {
                                return (globalIdx, BatchLabelResult(index: Double(globalIdx), labels: [], success: false, error: error.localizedDescription))
                            }
                        }
                    }
                    var out = [(Int, BatchLabelResult)]()
                    for await r in group { out.append(r) }
                    return out.sorted(by: { $0.0 < $1.0 }).map(\.1)
                }
                results.append(contentsOf: chunkResults)
            }
            return results
        }
    }

    func checkSafety(imageUri: String) throws -> Promise<SafetyResult> {
        return Promise.async {
            let labels = try await self.labelImage(imageUri, threshold: 0.0, maxLabels: Int.max)
            return self.buildSafety(labels)
        }
    }

    func checkSafetyBatch(imageUris: [String], options: BatchSafetyOptions?) throws -> Promise<[SafetyResult]> {
        return Promise.async {
            let concurrency = max(1, (options?.concurrency).map { Int($0) } ?? Self.defaultConcurrency)

            var results = [SafetyResult]()
            results.reserveCapacity(imageUris.count)

            for chunkStart in stride(from: 0, to: imageUris.count, by: concurrency) {
                let chunkEnd = min(chunkStart + concurrency, imageUris.count)
                let chunk = Array(imageUris[chunkStart..<chunkEnd])

                let chunkResults = await withTaskGroup(of: (Int, SafetyResult).self) { group in
                    for (i, uri) in chunk.enumerated() {
                        let globalIdx = chunkStart + i
                        group.addTask {
                            do {
                                let labels = try await self.labelImage(uri, threshold: 0.0, maxLabels: Int.max)
                                return (globalIdx, self.buildSafety(labels))
                            } catch {
                                // Fail open: an unreadable image is not "unsafe".
                                return (globalIdx, SafetyResult(safe: true, unsafeLabels: [], safetyScore: 1.0))
                            }
                        }
                    }
                    var out = [(Int, SafetyResult)]()
                    for await r in group { out.append(r) }
                    return out.sorted(by: { $0.0 < $1.0 }).map(\.1)
                }
                results.append(contentsOf: chunkResults)
            }
            return results
        }
    }

    func matchCategories(imageUri: String, categories: [String]) throws -> Promise<[ImageLabel]> {
        return Promise.async {
            let wanted = Set(categories.map { $0.lowercased() })
            let labels = try await self.labelImage(imageUri, threshold: 0.0, maxLabels: Int.max)
            return labels.filter { wanted.contains($0.text.lowercased()) }
        }
    }

    func isAvailable() throws -> Bool {
        return true
    }

    // MARK: - Private helpers

    private func labelImage(_ uri: String, threshold: Double, maxLabels: Int) async throws -> [ImageLabel] {
        guard let image = loadImage(from: uri) else {
            throw RuntimeError.error(withMessage: "Failed to load image: \(uri)")
        }
        let visionImage = VisionImage(image: image)
        visionImage.orientation = image.imageOrientation
        let mlLabels = try await labeler.process(visionImage)
        return mlLabels
            .filter { Double($0.confidence) >= threshold }
            .sorted { $0.confidence > $1.confidence }
            .prefix(maxLabels)
            .map { ImageLabel(text: $0.text, confidence: Double($0.confidence), index: Double($0.index)) }
    }

    private func buildSafety(_ labels: [ImageLabel]) -> SafetyResult {
        // Heuristic only: MLKit's general label set is NOT a trained NSFW classifier.
        let unsafe = labels.filter {
            Self.unsafeKeywords.contains($0.text.lowercased()) && $0.confidence >= Self.unsafeMinConfidence
        }
        let maxUnsafeConf = unsafe.map { $0.confidence }.max() ?? 0.0
        return SafetyResult(
            safe: unsafe.isEmpty,
            unsafeLabels: unsafe.map { $0.text },
            safetyScore: 1.0 - maxUnsafeConf
        )
    }

    private func loadImage(from uri: String) -> UIImage? {
        let path: String
        if uri.hasPrefix("file://") {
            path = String(uri.dropFirst(7))
        } else if uri.hasPrefix("/") {
            path = uri
        } else {
            guard let url = URL(string: uri), let data = try? Data(contentsOf: url) else { return nil }
            return UIImage(data: data)
        }
        return UIImage(contentsOfFile: path)
    }
}
