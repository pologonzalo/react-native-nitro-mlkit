import Foundation
import UIKit
import NitroModules
#if !targetEnvironment(simulator)
import MLKitObjectDetection
import MLKitObjectDetectionCommon
import MLKitVision
#endif

/**
 * Native iOS implementation of ObjectDetector (MLKit object detection).
 * Conforms to the Nitrogen-generated HybridObjectDetectorSpec protocol.
 * SINGLE_IMAGE mode with multiple objects + coarse classification.
 */
class HybridObjectDetector: HybridObjectDetectorSpec {

    // MARK: - HybridObject boilerplate
    var memorySize: Int { MemoryLayout<HybridObjectDetector>.size }

    #if targetEnvironment(simulator)

    // MARK: - Simulator stub (no arm64-sim slice from Google ML Kit)
    // Same pattern as @nitro-mlkit/face-detection: ML Kit's vendored frameworks
    // ship no arm64 iOS-Simulator slice, so on simulator we never import or
    // call into MLKit — every method throws a clear error instead. The
    // companion config plugin strips the frameworks from the simulator link.

    private static func simulatorError() -> RuntimeError {
        RuntimeError.error(withMessage: "Object detection isn't available on the iOS Simulator — Google ML Kit ships no arm64 Simulator slice. Run on a physical device.")
    }

    func detect(imageUri: String) throws -> Promise<[DetectedObject]> {
        return Promise.async { throw Self.simulatorError() }
    }

    func detectBatch(imageUris: [String], concurrency: Double) throws -> Promise<[BatchObjectResult]> {
        return Promise.async { throw Self.simulatorError() }
    }

    func isAvailable() throws -> Bool{
        return false
    }

    #else


    // MARK: - Lazy MLKit detector

    private lazy var detector: ObjectDetector = {
        let opts = ObjectDetectorOptions()
        opts.detectorMode = .singleImage
        opts.shouldEnableClassification = true
        opts.shouldEnableMultipleObjects = true
        return ObjectDetector.objectDetector(options: opts)
    }()

    // MARK: - Protocol methods

    func detect(imageUri: String) throws -> Promise<[DetectedObject]> {
        return Promise.async {
            return try await self.detectImage(imageUri)
        }
    }

    func detectBatch(imageUris: [String], concurrency: Double) throws -> Promise<[BatchObjectResult]> {
        return Promise.async {
            let maxConcurrent = max(1, Int(concurrency))
            var results = [BatchObjectResult]()
            results.reserveCapacity(imageUris.count)

            for chunkStart in stride(from: 0, to: imageUris.count, by: maxConcurrent) {
                let chunkEnd = min(chunkStart + maxConcurrent, imageUris.count)
                let chunk = Array(imageUris[chunkStart..<chunkEnd])

                let chunkResults = await withTaskGroup(of: (Int, BatchObjectResult).self) { group in
                    for (i, uri) in chunk.enumerated() {
                        let globalIdx = chunkStart + i
                        group.addTask {
                            do {
                                let objects = try await self.detectImage(uri)
                                return (globalIdx, BatchObjectResult(index: Double(globalIdx), objects: objects, success: true, error: nil))
                            } catch {
                                return (globalIdx, BatchObjectResult(index: Double(globalIdx), objects: [], success: false, error: error.localizedDescription))
                            }
                        }
                    }

                    var out = [(Int, BatchObjectResult)]()
                    for await result in group { out.append(result) }
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

    private func detectImage(_ uri: String) async throws -> [DetectedObject] {
        guard let image = self.loadImage(from: uri) else {
            throw RuntimeError.error(withMessage: "Failed to load image: \(uri)")
        }
        let visionImage = VisionImage(image: image)
        visionImage.orientation = image.imageOrientation

        let mlObjects = try await detector.process(visionImage)
        return mlObjects.map { self.mapObject($0) }
    }

    private func mapObject(_ obj: Object) -> DetectedObject {
        let frame = obj.frame
        // `obj.labels` are MLKit ObjectLabel values; the unqualified `ObjectLabel`
        // initializer below resolves to the Nitrogen-generated struct (same module).
        var labels = [ObjectLabel]()
        for label in obj.labels {
            labels.append(ObjectLabel(
                text: label.text,
                confidence: Double(label.confidence),
                index: Double(label.index)
            ))
        }

        let trackingId = obj.trackingID?.doubleValue ?? -1

        return DetectedObject(
            bounds: ObjectRect(
                x: Double(frame.origin.x),
                y: Double(frame.origin.y),
                width: Double(frame.width),
                height: Double(frame.height)
            ),
            trackingId: trackingId,
            labels: labels
        )
    }

    private func loadImage(from uri: String) -> UIImage? {
        guard let raw = self.loadRawImage(from: uri) else { return nil }
        // Redraw upright before any ML Kit call. ML Kit reports coordinates in
        // the image's RAW pixel buffer (the orientation flag only tells it
        // where "up" is), while JS measures the image at its EXIF-oriented
        // size — so portrait iPhone photos (landscape buffer + rotation flag)
        // came back with coordinates in the wrong space and overlays painted
        // off-body. Same fix face-recognition ships for cropping.
        return Self.uprightImage(raw)
    }

    /// Returns the image redrawn with orientation .up, so its pixel buffer
    /// matches its display size. `UIImage.size` already accounts for the
    /// orientation flag, so drawing into it bakes the rotation in.
    private static func uprightImage(_ image: UIImage) -> UIImage {
        guard image.imageOrientation != .up else { return image }
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: image.size, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: image.size))
        }
    }

    private func loadRawImage(from uri: String) -> UIImage? {
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

    #endif
}
