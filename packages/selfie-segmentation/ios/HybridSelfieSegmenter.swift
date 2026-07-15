import Foundation
import UIKit
import CoreVideo
import CoreGraphics
import NitroModules
import MLKitSegmentationSelfie
import MLKitSegmentationCommon
import MLKitVision

/**
 * Native iOS implementation of SelfieSegmenter (MLKit selfie segmentation).
 * Produces a foreground-confidence mask as a PNG (white RGB, alpha = confidence),
 * writes it to a temp file, and reports the foreground ratio.
 * Conforms to the Nitrogen-generated HybridSelfieSegmenterSpec protocol.
 */
class HybridSelfieSegmenter: HybridSelfieSegmenterSpec {

    // MARK: - HybridObject boilerplate
    var memorySize: Int { MemoryLayout<HybridSelfieSegmenter>.size }

    // MARK: - Lazy MLKit segmenter

    private lazy var segmenter: Segmenter = {
        let opts = SelfieSegmenterOptions()
        opts.segmenterMode = .singleImage
        return Segmenter.segmenter(options: opts)
    }()

    // MARK: - Protocol methods

    func segment(imageUri: String) throws -> Promise<SegmentationResult> {
        return Promise.async {
            return try await self.segmentImage(imageUri)
        }
    }

    func segmentBatch(imageUris: [String], concurrency: Double) throws -> Promise<[BatchSegmentationResult]> {
        return Promise.async {
            let maxConcurrent = max(1, Int(concurrency))
            var results = [BatchSegmentationResult]()
            results.reserveCapacity(imageUris.count)

            for chunkStart in stride(from: 0, to: imageUris.count, by: maxConcurrent) {
                let chunkEnd = min(chunkStart + maxConcurrent, imageUris.count)
                let chunk = Array(imageUris[chunkStart..<chunkEnd])

                let chunkResults = await withTaskGroup(of: (Int, BatchSegmentationResult).self) { group in
                    for (i, uri) in chunk.enumerated() {
                        let globalIdx = chunkStart + i
                        group.addTask {
                            do {
                                let result = try await self.segmentImage(uri)
                                return (globalIdx, BatchSegmentationResult(index: Double(globalIdx), result: result, success: true, error: nil))
                            } catch {
                                return (globalIdx, BatchSegmentationResult(
                                    index: Double(globalIdx),
                                    result: SegmentationResult(maskUri: "", width: 0, height: 0, foregroundRatio: 0),
                                    success: false,
                                    error: error.localizedDescription
                                ))
                            }
                        }
                    }

                    var out = [(Int, BatchSegmentationResult)]()
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

    private func segmentImage(_ uri: String) async throws -> SegmentationResult {
        guard let image = self.loadImage(from: uri) else {
            throw RuntimeError.error(withMessage: "Failed to load image: \(uri)")
        }
        let visionImage = VisionImage(image: image)
        visionImage.orientation = image.imageOrientation

        let mask = try await segmenter.process(visionImage)

        // iOS SegmentationMask exposes only `buffer` (a CVPixelBuffer); read the
        // dimensions from it (the width/height members exist only on Android).
        let width = CVPixelBufferGetWidth(mask.buffer)
        let height = CVPixelBufferGetHeight(mask.buffer)
        let total = width * height
        guard total > 0 else {
            throw RuntimeError.error(withMessage: "Empty segmentation mask")
        }

        let pixelBuffer = mask.buffer
        CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
        guard let base = CVPixelBufferGetBaseAddress(pixelBuffer) else {
            CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly)
            throw RuntimeError.error(withMessage: "Failed to read segmentation mask buffer")
        }
        let bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer)

        // Build a white RGBA image whose alpha channel is the per-pixel foreground
        // confidence (mirrors the Android PNG output).
        var rgba = [UInt8](repeating: 0, count: total * 4)
        var foreground = 0
        for row in 0..<height {
            let rowPtr = base.advanced(by: row * bytesPerRow).assumingMemoryBound(to: Float32.self)
            for col in 0..<width {
                let conf = rowPtr[col]
                if conf > 0.5 { foreground += 1 }
                let alpha = UInt8(max(0, min(255, Int(conf * 255.0))))
                let idx = (row * width + col) * 4
                rgba[idx] = 255      // R
                rgba[idx + 1] = 255  // G
                rgba[idx + 2] = 255  // B
                rgba[idx + 3] = alpha
            }
        }
        CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly)

        // Encode to a non-premultiplied RGBA CGImage → UIImage → PNG.
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        let bitmapInfo = CGBitmapInfo(rawValue: CGImageAlphaInfo.last.rawValue)
        let data = Data(rgba)
        guard let provider = CGDataProvider(data: data as CFData),
              let cgImage = CGImage(
                  width: width,
                  height: height,
                  bitsPerComponent: 8,
                  bitsPerPixel: 32,
                  bytesPerRow: width * 4,
                  space: colorSpace,
                  bitmapInfo: bitmapInfo,
                  provider: provider,
                  decode: nil,
                  shouldInterpolate: false,
                  intent: .defaultIntent
              ) else {
            throw RuntimeError.error(withMessage: "Failed to build mask image")
        }

        guard let png = UIImage(cgImage: cgImage).pngData() else {
            throw RuntimeError.error(withMessage: "Failed to encode mask PNG")
        }

        let tempPath = NSTemporaryDirectory() + "nitro_selfie_\(UUID().uuidString).png"
        try png.write(to: URL(fileURLWithPath: tempPath))

        return SegmentationResult(
            maskUri: "file://\(tempPath)",
            width: Double(width),
            height: Double(height),
            foregroundRatio: Double(foreground) / Double(total)
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
