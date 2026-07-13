import Foundation
import UIKit
import NitroModules
import MLKitFaceDetection
import MLKitVision

/**
 * Native iOS implementation of FaceDetector.
 * Conforms to the Nitrogen-generated HybridFaceDetectorSpec protocol.
 */
class HybridFaceDetector: HybridFaceDetectorSpec {
    
    // MARK: - HybridObject boilerplate
    var hybridContext = margelo.nitro.HybridContext()
    var memorySize: Int { MemoryLayout<HybridFaceDetector>.size }
    
    // MARK: - Lazy MLKit detectors
    
    private lazy var fastDetector: MLKitFaceDetection.FaceDetector = {
        let opts = FaceDetectorOptions()
        opts.performanceMode = .fast
        opts.landmarkMode = .none
        opts.classificationMode = .none
        return MLKitFaceDetection.FaceDetector.faceDetector(options: opts)
    }()
    
    private lazy var accurateDetector: MLKitFaceDetection.FaceDetector = {
        let opts = FaceDetectorOptions()
        opts.performanceMode = .accurate
        opts.landmarkMode = .all
        opts.classificationMode = .all
        return MLKitFaceDetection.FaceDetector.faceDetector(options: opts)
    }()
    
    // MARK: - Protocol methods
    
    func detect(imageUri: String, options: FaceDetectionOptions) throws -> Promise<[DetectedFace]> {
        return Promise.async {
            guard let image = self.loadImage(from: imageUri) else {
                throw RuntimeError.error(withMessage: "Failed to load image: \(imageUri)")
            }
            let visionImage = VisionImage(image: image)
            visionImage.orientation = image.imageOrientation
            
            let detector = options.performanceMode == .accurate ? self.accurateDetector : self.fastDetector
            let mlFaces = try await detector.process(visionImage)
            
            return mlFaces.map { self.mapFace($0, withLandmarks: options.landmarks) }
        }
    }
    
    func detectBatch(imageUris: [String], concurrency: Double) throws -> Promise<[BatchCropResult]> {
        return Promise.async {
            let maxConcurrent = Int(concurrency)
            var results = [BatchCropResult]()
            results.reserveCapacity(imageUris.count)
            
            // Process in chunks for controlled concurrency
            for chunkStart in stride(from: 0, to: imageUris.count, by: maxConcurrent) {
                let chunkEnd = min(chunkStart + maxConcurrent, imageUris.count)
                let chunk = Array(imageUris[chunkStart..<chunkEnd])
                
                let chunkResults = await withTaskGroup(of: (Int, BatchCropResult).self) { group in
                    for (i, uri) in chunk.enumerated() {
                        let globalIdx = chunkStart + i
                        group.addTask {
                            do {
                                guard let img = self.loadImage(from: uri) else {
                                    return (globalIdx, BatchCropResult(index: Double(globalIdx), faces: [], crops: [], success: false))
                                }
                                let visionImage = VisionImage(image: img)
                                let mlFaces = try await self.fastDetector.process(visionImage)
                                let faces = mlFaces.map { self.mapFace($0, withLandmarks: false) }
                                return (globalIdx, BatchCropResult(index: Double(globalIdx), faces: faces, crops: [], success: true))
                            } catch {
                                return (globalIdx, BatchCropResult(index: Double(globalIdx), faces: [], crops: [], success: false))
                            }
                        }
                    }
                    
                    var chunkOut = [(Int, BatchCropResult)]()
                    for await result in group { chunkOut.append(result) }
                    return chunkOut.sorted(by: { $0.0 < $1.0 }).map(\.1)
                }
                results.append(contentsOf: chunkResults)
            }
            return results
        }
    }
    
    func detectPrimary(imageUri: String) throws -> Promise<DetectedFace> {
        return Promise.async {
            guard let image = self.loadImage(from: imageUri) else {
                throw RuntimeError.error(withMessage: "Failed to load image: \(imageUri)")
            }
            let visionImage = VisionImage(image: image)
            let mlFaces = try await self.accurateDetector.process(visionImage)
            
            guard let largest = mlFaces.max(by: {
                $0.frame.width * $0.frame.height < $1.frame.width * $1.frame.height
            }) else {
                throw RuntimeError.error(withMessage: "No face detected")
            }
            return self.mapFace(largest, withLandmarks: true)
        }
    }
    
    func cropFaces(imageUri: String, padding: Double) throws -> Promise<[CroppedFace]> {
        return Promise.async {
            guard let image = self.loadImage(from: imageUri),
                  let cgImage = image.cgImage else {
                throw RuntimeError.error(withMessage: "Failed to load image")
            }
            let visionImage = VisionImage(image: image)
            let mlFaces = try await self.fastDetector.process(visionImage)
            
            let imgW = Double(cgImage.width)
            let imgH = Double(cgImage.height)
            var crops = [CroppedFace]()
            
            for (idx, face) in mlFaces.enumerated() {
                let bounds = face.frame
                let padX = Double(bounds.width) * padding
                let padY = Double(bounds.height) * padding
                
                let x = max(0, Double(bounds.origin.x) - padX)
                let y = max(0, Double(bounds.origin.y) - padY)
                let w = min(imgW - x, Double(bounds.width) + padX * 2)
                let h = min(imgH - y, Double(bounds.height) + padY * 2)
                
                let cropRect = CGRect(x: x, y: y, width: w, height: h)
                guard let cropped = cgImage.cropping(to: cropRect) else { continue }
                
                let tempPath = NSTemporaryDirectory() + "nitro_face_\(UUID().uuidString).jpg"
                let croppedImg = UIImage(cgImage: cropped)
                guard let data = croppedImg.jpegData(compressionQuality: 0.8) else { continue }
                try data.write(to: URL(fileURLWithPath: tempPath))
                
                crops.append(CroppedFace(
                    uri: "file://\(tempPath)",
                    faceIndex: Double(idx),
                    width: w,
                    height: h
                ))
            }
            return crops
        }
    }
    
    func extractEmbedding(faceUri: String) throws -> Promise<[Double]> {
        return Promise.async {
            // TODO: Load MobileFaceNet TFLite model and run inference
            // For now return placeholder embedding
            throw RuntimeError.error(withMessage: "MobileFaceNet model not yet loaded. Coming in v0.2.0")
        }
    }
    
    func compareFaces(embedding1: [Double], embedding2: [Double]) throws -> Double {
        // Cosine similarity
        guard embedding1.count == embedding2.count, !embedding1.isEmpty else { return 0 }
        var dot = 0.0, mag1 = 0.0, mag2 = 0.0
        for i in 0..<embedding1.count {
            dot += embedding1[i] * embedding2[i]
            mag1 += embedding1[i] * embedding1[i]
            mag2 += embedding2[i] * embedding2[i]
        }
        let denom = sqrt(mag1) * sqrt(mag2)
        return denom > 0 ? (dot / denom + 1.0) / 2.0 : 0 // normalize to 0..1
    }
    
    func extractPrimaryEmbedding(imageUri: String) throws -> Promise<[Double]> {
        return Promise.async {
            // TODO: detect primary face → crop → embed with MobileFaceNet
            throw RuntimeError.error(withMessage: "MobileFaceNet model not yet loaded. Coming in v0.2.0")
        }
    }
    
    func detectAndEmbed(imageUris: [String], concurrency: Double) throws -> Promise<[BatchEmbeddingResult]> {
        return Promise.async {
            // TODO: batch detect + embed
            throw RuntimeError.error(withMessage: "MobileFaceNet model not yet loaded. Coming in v0.2.0")
        }
    }
    
    func isAvailable() throws -> Bool {
        return true
    }
    
    // MARK: - Private helpers
    
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
    
    private func mapFace(_ face: Face, withLandmarks: Bool) -> DetectedFace {
        var landmarks = [FaceLandmark]()
        if withLandmarks {
            let pairs: [(FaceLandmarkType, MLKitFaceDetection.FaceLandmarkType)] = [
                (.leftEye, .leftEye), (.rightEye, .rightEye),
                (.leftEar, .leftEar), (.rightEar, .rightEar),
                (.leftCheek, .leftCheek), (.rightCheek, .rightCheek),
                (.noseBase, .noseBase), (.mouthLeft, .mouthLeft),
                (.mouthRight, .mouthRight), (.mouthBottom, .mouthBottom),
            ]
            for (type, mlType) in pairs {
                if let lm = face.landmark(ofType: mlType) {
                    landmarks.append(FaceLandmark(type: type, x: Double(lm.position.x), y: Double(lm.position.y)))
                }
            }
        }
        
        return DetectedFace(
            bounds: FaceBounds(
                x: Double(face.frame.origin.x),
                y: Double(face.frame.origin.y),
                width: Double(face.frame.width),
                height: Double(face.frame.height)
            ),
            headEulerAngleY: Double(face.headEulerAngleY),
            headEulerAngleZ: Double(face.headEulerAngleZ),
            leftEyeOpenProbability: Double(face.leftEyeOpenProbability),
            rightEyeOpenProbability: Double(face.rightEyeOpenProbability),
            smilingProbability: Double(face.smilingProbability),
            landmarks: landmarks,
            trackingId: Double(face.hasTrackingID ? face.trackingID : -1)
        )
    }
}
