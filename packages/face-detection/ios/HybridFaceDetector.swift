import Foundation
import MLKitFaceDetection
import MLKitVision
import NitroModules

/// Native iOS implementation of the FaceDetector HybridObject.
/// Uses Google ML Kit for face detection (on-device, free).
class HybridFaceDetector: HybridFaceDetectorSpec {
    
    // MARK: - HybridObject
    
    var hybridContext = margelo.nitro.HybridContext()
    var memorySize: Int { return getSizeOf(self) }
    
    // MARK: - Shared detector instances
    
    private lazy var fastDetector: MLKitFaceDetection.FaceDetector = {
        let options = FaceDetectorOptions()
        options.performanceMode = .fast
        options.landmarkMode = .none
        options.classificationMode = .none
        return MLKitFaceDetection.FaceDetector.faceDetector(options: options)
    }()
    
    private lazy var accurateDetector: MLKitFaceDetection.FaceDetector = {
        let options = FaceDetectorOptions()
        options.performanceMode = .accurate
        options.landmarkMode = .all
        options.classificationMode = .all
        return MLKitFaceDetection.FaceDetector.faceDetector(options: options)
    }()
    
    // MARK: - Public API
    
    func detect(imageUri: String, options: FaceDetectionOptions?) async throws -> [DetectedFace] {
        guard let image = loadImage(from: imageUri) else {
            throw RuntimeError.error(withMessage: "Failed to load image: \(imageUri)")
        }
        
        let detector = getDetector(for: options)
        let visionImage = VisionImage(image: image)
        visionImage.orientation = image.imageOrientation
        
        let mlFaces = try await detector.process(visionImage)
        return mlFaces.map { mapFace($0, options: options) }
    }
    
    func detectBatch(imageUris: [String], options: BatchOptions?) async throws -> [BatchCropResult] {
        let concurrency = options?.concurrency ?? 4
        let opts = options as FaceDetectionOptions?
        
        return await withTaskGroup(of: (Int, BatchCropResult).self) { group in
            var results = [BatchCropResult](repeating: BatchCropResult(
                index: 0, faces: [], crops: [], success: false, error: nil
            ), count: imageUris.count)
            
            for (index, uri) in imageUris.enumerated() {
                // Limit concurrency
                if index >= concurrency {
                    if let result = await group.next() {
                        results[result.0] = result.1
                    }
                }
                
                group.addTask {
                    do {
                        let faces = try await self.detect(imageUri: uri, options: opts)
                        var crops: [CroppedFace] = []
                        
                        if options?.cropFaces == true {
                            crops = await self.cropFacesInternal(
                                imageUri: uri,
                                faces: faces,
                                padding: options?.cropPadding ?? 0.3
                            )
                        }
                        
                        return (index, BatchCropResult(
                            index: index, faces: faces, crops: crops,
                            success: true, error: nil
                        ))
                    } catch {
                        return (index, BatchCropResult(
                            index: index, faces: [], crops: [],
                            success: false, error: error.localizedDescription
                        ))
                    }
                }
            }
            
            for await result in group {
                results[result.0] = result.1
            }
            
            return results
        }
    }
    
    func detectPrimary(imageUri: String, options: FaceDetectionOptions?) async throws -> DetectedFace? {
        let faces = try await detect(imageUri: imageUri, options: options)
        // Return the largest face (biggest bounding box area)
        return faces.max(by: {
            $0.bounds.width * $0.bounds.height < $1.bounds.width * $1.bounds.height
        })
    }
    
    func cropFaces(imageUri: String, options: FaceDetectionOptions?, padding: Double?) async throws -> [CroppedFace] {
        let faces = try await detect(imageUri: imageUri, options: options)
        return await cropFacesInternal(imageUri: imageUri, faces: faces, padding: padding ?? 0.3)
    }
    
    func isAvailable() -> Bool {
        return true // ML Kit is always available on iOS 17+
    }
    
    // MARK: - Private Helpers
    
    private func getDetector(for options: FaceDetectionOptions?) -> MLKitFaceDetection.FaceDetector {
        if options?.performanceMode == "accurate" {
            return accurateDetector
        }
        return fastDetector
    }
    
    private func loadImage(from uri: String) -> UIImage? {
        if uri.hasPrefix("file://") {
            let path = String(uri.dropFirst(7))
            return UIImage(contentsOfFile: path)
        } else if uri.hasPrefix("/") {
            return UIImage(contentsOfFile: uri)
        }
        // Handle other URI schemes as needed
        guard let url = URL(string: uri), let data = try? Data(contentsOf: url) else {
            return nil
        }
        return UIImage(data: data)
    }
    
    private func mapFace(_ face: Face, options: FaceDetectionOptions?) -> DetectedFace {
        var landmarks: [FaceLandmark] = []
        if options?.landmarks == true {
            landmarks = mapLandmarks(face)
        }
        
        return DetectedFace(
            bounds: FaceBounds(
                x: Double(face.frame.origin.x),
                y: Double(face.frame.origin.y),
                width: Double(face.frame.size.width),
                height: Double(face.frame.size.height)
            ),
            headEulerAngleY: Double(face.headEulerAngleY),
            headEulerAngleZ: Double(face.headEulerAngleZ),
            leftEyeOpenProbability: Double(face.leftEyeOpenProbability),
            rightEyeOpenProbability: Double(face.rightEyeOpenProbability),
            smilingProbability: Double(face.smilingProbability),
            landmarks: landmarks,
            trackingId: face.hasTrackingID ? Int(face.trackingID) : -1
        )
    }
    
    private func mapLandmarks(_ face: Face) -> [FaceLandmark] {
        var result: [FaceLandmark] = []
        let pairs: [(FaceLandmarkType, MLKitFaceDetection.FaceLandmarkType)] = [
            (.leftEye, .leftEye),
            (.rightEye, .rightEye),
            (.leftEar, .leftEar),
            (.rightEar, .rightEar),
            (.leftCheek, .leftCheek),
            (.rightCheek, .rightCheek),
            (.noseBase, .noseBase),
            (.mouthLeft, .mouthLeft),
            (.mouthRight, .mouthRight),
            (.mouthBottom, .mouthBottom),
        ]
        for (type, mlType) in pairs {
            if let landmark = face.landmark(ofType: mlType) {
                result.append(FaceLandmark(
                    type: type,
                    x: Double(landmark.position.x),
                    y: Double(landmark.position.y)
                ))
            }
        }
        return result
    }
    
    private func cropFacesInternal(imageUri: String, faces: [DetectedFace], padding: Double) async -> [CroppedFace] {
        guard let image = loadImage(from: imageUri),
              let cgImage = image.cgImage else { return [] }
        
        let imgW = Double(cgImage.width)
        let imgH = Double(cgImage.height)
        var crops: [CroppedFace] = []
        
        for (index, face) in faces.enumerated() {
            let padX = face.bounds.width * padding
            let padY = face.bounds.height * padding
            
            let x = max(0, face.bounds.x - padX)
            let y = max(0, face.bounds.y - padY)
            let w = min(imgW - x, face.bounds.width + padX * 2)
            let h = min(imgH - y, face.bounds.height + padY * 2)
            
            let cropRect = CGRect(x: x, y: y, width: w, height: h)
            
            guard let cropped = cgImage.cropping(to: cropRect) else { continue }
            let croppedImage = UIImage(cgImage: cropped)
            
            // Save to temp file
            let tempDir = NSTemporaryDirectory()
            let filename = "nitro_face_\(UUID().uuidString).jpg"
            let filePath = (tempDir as NSString).appendingPathComponent(filename)
            
            guard let data = croppedImage.jpegData(compressionQuality: 0.8) else { continue }
            do {
                try data.write(to: URL(fileURLWithPath: filePath))
                crops.append(CroppedFace(
                    uri: "file://\(filePath)",
                    faceIndex: index,
                    width: Int(w),
                    height: Int(h)
                ))
            } catch {
                continue
            }
        }
        
        return crops
    }
}
