import Foundation
import UIKit
import NitroModules
import MLKitTextRecognition
import MLKitVision

/**
 * Native iOS implementation of TextRecognizer.
 * Conforms to the Nitrogen-generated HybridTextRecognizerSpec protocol.
 *
 * Uses MLKit's bundled Latin text-recognition model. Returns the full text plus
 * a structured block -> line -> element hierarchy with bounding boxes. Mirrors
 * the Android (Kotlin) implementation.
 */
class HybridTextRecognizer: HybridTextRecognizerSpec {

    // MARK: - HybridObject boilerplate
    var memorySize: Int { MemoryLayout<HybridTextRecognizer>.size }

    private lazy var recognizer: TextRecognizer =
        TextRecognizer.textRecognizer(options: TextRecognizerOptions())

    // MARK: - Spec methods

    func recognize(imageUri: String) throws -> Promise<RecognizedText> {
        return Promise.async {
            return try await self.recognizeImage(imageUri)
        }
    }

    func recognizeText(imageUri: String) throws -> Promise<String> {
        return Promise.async {
            return try await self.recognizeImage(imageUri).text
        }
    }

    func recognizeBatch(imageUris: [String], concurrency: Double) throws -> Promise<[BatchTextResult]> {
        return Promise.async {
            let maxConcurrent = max(1, Int(concurrency))
            var results = [BatchTextResult]()
            results.reserveCapacity(imageUris.count)

            for chunkStart in stride(from: 0, to: imageUris.count, by: maxConcurrent) {
                let chunkEnd = min(chunkStart + maxConcurrent, imageUris.count)
                let chunk = Array(imageUris[chunkStart..<chunkEnd])

                let chunkResults = await withTaskGroup(of: (Int, BatchTextResult).self) { group in
                    for (i, uri) in chunk.enumerated() {
                        let globalIdx = chunkStart + i
                        group.addTask {
                            do {
                                let text = try await self.recognizeImage(uri)
                                return (globalIdx, BatchTextResult(index: Double(globalIdx), text: text, success: true, error: nil))
                            } catch {
                                return (globalIdx, BatchTextResult(
                                    index: Double(globalIdx),
                                    text: RecognizedText(text: "", blocks: []),
                                    success: false,
                                    error: error.localizedDescription
                                ))
                            }
                        }
                    }
                    var out = [(Int, BatchTextResult)]()
                    for await r in group { out.append(r) }
                    return out.sorted(by: { $0.0 < $1.0 }).map(\.1)
                }
                results.append(contentsOf: chunkResults)
            }
            return results
        }
    }

    func isAvailable() throws -> Bool {
        return true
    }

    // MARK: - Private helpers

    private func recognizeImage(_ uri: String) async throws -> RecognizedText {
        guard let image = loadImage(from: uri) else {
            throw RuntimeError.error(withMessage: "Failed to load image: \(uri)")
        }
        let visionImage = VisionImage(image: image)
        visionImage.orientation = image.imageOrientation
        let result = try await recognizer.process(visionImage)
        return mapText(result)
    }

    private func rect(_ frame: CGRect) -> TextRect {
        return TextRect(
            x: Double(frame.origin.x),
            y: Double(frame.origin.y),
            width: Double(frame.width),
            height: Double(frame.height)
        )
    }

    private func mapText(_ t: MLKitTextRecognition.Text) -> RecognizedText {
        let blocks: [TextBlock] = t.blocks.map { block in
            let lines: [TextLine] = block.lines.map { line in
                let elements: [TextElement] = line.elements.map { element in
                    TextElement(text: element.text, bounds: self.rect(element.frame))
                }
                return TextLine(text: line.text, bounds: self.rect(line.frame), elements: elements)
            }
            return TextBlock(text: block.text, bounds: self.rect(block.frame), lines: lines)
        }
        return RecognizedText(text: t.text, blocks: blocks)
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
