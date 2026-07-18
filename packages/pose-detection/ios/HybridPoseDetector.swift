import Foundation
import UIKit
import NitroModules
import MLKitPoseDetection
import MLKitPoseDetectionCommon
import MLKitVision

/**
 * Native iOS implementation of PoseDetector (MLKit pose detection).
 * Returns the 33 skeletal landmarks of the primary detected body (SINGLE_IMAGE mode).
 * Conforms to the Nitrogen-generated HybridPoseDetectorSpec protocol.
 */
class HybridPoseDetector: HybridPoseDetectorSpec {

    // MARK: - HybridObject boilerplate
    var memorySize: Int { MemoryLayout<HybridPoseDetector>.size }

    // MARK: - Lazy MLKit detector

    private lazy var detector: PoseDetector = {
        let opts = PoseDetectorOptions()
        opts.detectorMode = .singleImage
        return PoseDetector.poseDetector(options: opts)
    }()

    /// Maps each iOS `PoseLandmarkType` to the integer index the Kotlin/JS side expects.
    /// This mirrors the Android ML Kit `PoseLandmark.landmarkType` int constants (0..32,
    /// the standard BlazePose ordering). iOS ships string-based landmark types, so we map
    /// them back to the same ordinal.
    private static let landmarkIndexMap: [PoseLandmarkType: Int] = [
        .nose: 0,
        .leftEyeInner: 1,
        .leftEye: 2,
        .leftEyeOuter: 3,
        .rightEyeInner: 4,
        .rightEye: 5,
        .rightEyeOuter: 6,
        .leftEar: 7,
        .rightEar: 8,
        .mouthLeft: 9,
        .mouthRight: 10,
        .leftShoulder: 11,
        .rightShoulder: 12,
        .leftElbow: 13,
        .rightElbow: 14,
        .leftWrist: 15,
        .rightWrist: 16,
        .leftPinkyFinger: 17,
        .rightPinkyFinger: 18,
        .leftIndexFinger: 19,
        .rightIndexFinger: 20,
        .leftThumb: 21,
        .rightThumb: 22,
        .leftHip: 23,
        .rightHip: 24,
        .leftKnee: 25,
        .rightKnee: 26,
        .leftAnkle: 27,
        .rightAnkle: 28,
        .leftHeel: 29,
        .rightHeel: 30,
        .leftToe: 31,
        .rightToe: 32,
    ]

    // MARK: - Protocol methods

    func detect(imageUri: String) throws -> Promise<[PoseLandmark]> {
        return Promise.async {
            return try await self.detectImage(imageUri)
        }
    }

    func detectBatch(imageUris: [String], concurrency: Double) throws -> Promise<[BatchPoseResult]> {
        return Promise.async {
            let maxConcurrent = max(1, Int(concurrency))
            var results = [BatchPoseResult]()
            results.reserveCapacity(imageUris.count)

            for chunkStart in stride(from: 0, to: imageUris.count, by: maxConcurrent) {
                let chunkEnd = min(chunkStart + maxConcurrent, imageUris.count)
                let chunk = Array(imageUris[chunkStart..<chunkEnd])

                let chunkResults = await withTaskGroup(of: (Int, BatchPoseResult).self) { group in
                    for (i, uri) in chunk.enumerated() {
                        let globalIdx = chunkStart + i
                        group.addTask {
                            do {
                                let landmarks = try await self.detectImage(uri)
                                return (globalIdx, BatchPoseResult(index: Double(globalIdx), landmarks: landmarks, success: true, error: nil))
                            } catch {
                                return (globalIdx, BatchPoseResult(index: Double(globalIdx), landmarks: [], success: false, error: error.localizedDescription))
                            }
                        }
                    }

                    var out = [(Int, BatchPoseResult)]()
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

    private func detectImage(_ uri: String) async throws -> [PoseLandmark] {
        guard let image = self.loadImage(from: uri) else {
            throw RuntimeError.error(withMessage: "Failed to load image: \(uri)")
        }
        let visionImage = VisionImage(image: image)
        visionImage.orientation = image.imageOrientation

        let poses = try await detector.process(visionImage)
        guard let pose = poses.first else { return [] }

        return pose.landmarks.map { lm in
            PoseLandmark(
                type: Double(HybridPoseDetector.landmarkIndexMap[lm.type] ?? -1),
                x: Double(lm.position.x),
                y: Double(lm.position.y),
                z: Double(lm.position.z),
                inFrameLikelihood: Double(lm.inFrameLikelihood)
            )
        }
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
