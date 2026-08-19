import Foundation
import UIKit
import Photos
import NitroModules
#if !targetEnvironment(simulator)
import MLKitFaceDetection
import MLKitVision
import TensorFlowLite
#endif

/**
 * Native iOS implementation of FaceRecognizer.
 *
 * ML Kit finds & crops faces; a TensorFlow Lite face-embedding model (provided
 * at runtime, e.g. MobileFaceNet) turns each crop into a vector. Cosine
 * similarity against an in-memory registry answers "who is this?". Input and
 * output tensor shapes are read from the model, so 112×112 / 128-d / 192-d
 * variants all work — same contract as the Kotlin implementation, same model
 * file, same normalisation `(px − 127.5) / 128`.
 *
 * Four things here are not obvious:
 *
 * 1. **TensorFlowLiteSwift, not TensorFlowLiteObjC.** The first attempt at this
 *    podspec depended on `TensorFlowLiteObjC`, which ships no module map, so
 *    `pod install` broke and the whole package was made Android-only (see the
 *    repo HANDOFF, session 6). `TensorFlowLiteSwift` vends the `TensorFlowLite`
 *    Swift module and imports cleanly.
 *
 * 2. **Every image is redrawn upright before it is touched.** ML Kit reports
 *    face frames in the *oriented* image's coordinate space, while
 *    `CGImage.cropping` works on raw pixels. For any photo with an EXIF
 *    orientation other than `.up` — i.e. most portrait iPhone shots — those two
 *    spaces disagree and the crop lands on an ear, or off the image entirely.
 *    Normalising once in `loadImage` keeps detection and cropping in the same
 *    space and costs one redraw of an already-downscaled image.
 *
 * 3. **A TFLite `Interpreter` is not thread-safe.** `findPeopleInPhotos` runs
 *    detection concurrently (that is where the time goes: ~10× the embedding),
 *    but every `invoke()` is serialised behind `modelLock`. Pixel preparation
 *    stays outside the lock so the workers still overlap.
 *
 * 4. **`ph://` photos are loaded as PhotoKit renditions, never as originals.**
 *    A gallery scan over an iCloud-optimised library would otherwise download
 *    gigabytes of full-resolution files. `PHImageManager` with a `targetSize`
 *    serves the locally-cached rendition (devices with "Optimise Storage" keep
 *    one for nearly everything); when only iCloud has the pixels, the request
 *    fails fast under `allowNetworkAccess: false` and the photo is reported as
 *    `error: "icloud"` so the caller can offer a deliberate second pass.
 *
 * On the iOS Simulator Google ML Kit's vendored frameworks have no arm64 slice,
 * so — exactly as in `@nitro-mlkit/face-detection` — nothing here imports or
 * calls MLKit there and every recognition method throws a clear error instead.
 * The registry and `compare()` are pure math and work everywhere.
 */
class HybridFaceRecognizer: HybridFaceRecognizerSpec {

    // MARK: - HybridObject boilerplate

    var memorySize: Int { MemoryLayout<HybridFaceRecognizer>.size }

    // MARK: - Registry (no MLKit — works on device and simulator)

    private let registryLock = NSLock()
    private var registry: [String: RegisteredPerson] = [:]

    private func person(_ id: String) -> RegisteredPerson? {
        registryLock.lock()
        defer { registryLock.unlock() }
        return registry[id]
    }

    private func store(_ person: RegisteredPerson) {
        registryLock.lock()
        defer { registryLock.unlock() }
        registry[person.id] = person
    }

    func removePerson(id: String) throws {
        registryLock.lock()
        defer { registryLock.unlock() }
        registry.removeValue(forKey: id)
    }

    func clearRegistry() throws {
        registryLock.lock()
        defer { registryLock.unlock() }
        registry.removeAll()
    }

    func getRegistry() throws -> [RegisteredPerson] {
        registryLock.lock()
        defer { registryLock.unlock() }
        return Array(registry.values)
    }

    /// Cosine similarity, clamped to 0..1 — same as the Kotlin side. A negative
    /// cosine means "nothing alike", so clamping (rather than remapping to 0.5)
    /// keeps the number readable as a confidence.
    func compare(embedding1: [Double], embedding2: [Double]) throws -> Double {
        return min(max(Self.cosine(embedding1, embedding2), 0), 1)
    }

    private static func cosine(_ a: [Double], _ b: [Double]) -> Double {
        guard a.count == b.count, !a.isEmpty else { return 0 }
        var dot = 0.0, ma = 0.0, mb = 0.0
        for i in 0..<a.count {
            dot += a[i] * b[i]
            ma += a[i] * a[i]
            mb += b[i] * b[i]
        }
        let denom = sqrt(ma) * sqrt(mb)
        return denom > 0 ? dot / denom : 0
    }

    private static func l2normalize(_ v: [Double]) -> [Double] {
        var mag = 0.0
        for e in v { mag += e * e }
        mag = sqrt(mag)
        return mag > 0 ? v.map { $0 / mag } : v
    }

    /// Best match in the registry, or nil when the registry is empty or nothing
    /// clears `minSim`.
    private func bestMatch(_ embedding: [Double], minSim: Double) -> FaceSearchResult? {
        registryLock.lock()
        let people = Array(registry.values)
        registryLock.unlock()

        var best: RegisteredPerson?
        var bestSim = -1.0
        for candidate in people {
            let sim = Self.cosine(embedding, candidate.embedding)
            if sim > bestSim {
                bestSim = sim
                best = candidate
            }
        }
        guard let match = best else { return nil }
        let score = min(max(bestSim, 0), 1)
        return score >= minSim ? FaceSearchResult(person: match, similarity: score) : nil
    }

    #if targetEnvironment(simulator)

    // MARK: - Simulator stub (no arm64-sim slice from Google ML Kit)

    private static func simulatorError() -> RuntimeError {
        RuntimeError.error(withMessage: "Face recognition isn't available on the iOS Simulator — Google ML Kit ships no arm64 Simulator slice. Run on a physical device.")
    }

    func downloadModel(url: String) throws -> Promise<Bool> {
        return Promise.async { throw Self.simulatorError() }
    }

    func loadModel(fileUri: String) throws -> Promise<Bool> {
        return Promise.async { throw Self.simulatorError() }
    }

    func isModelReady() throws -> Bool {
        return false
    }

    func registerPerson(id: String, name: String, imageUri: String) throws -> Promise<Bool> {
        return Promise.async { throw Self.simulatorError() }
    }

    func addReference(id: String, imageUri: String) throws -> Promise<Bool> {
        return Promise.async { throw Self.simulatorError() }
    }

    func findPeople(imageUri: String) throws -> Promise<[FaceSearchResult]> {
        return Promise.async { throw Self.simulatorError() }
    }

    func findPeopleInPhotos(imageUris: [String], options: FindPeopleOptions?) throws -> Promise<[PhotoPersonResult]> {
        return Promise.async { throw Self.simulatorError() }
    }

    func identifyFace(faceUri: String) throws -> Promise<FaceSearchResult?> {
        return Promise.async { throw Self.simulatorError() }
    }

    func extractEmbedding(faceUri: String) throws -> Promise<FaceEmbedding> {
        return Promise.async { throw Self.simulatorError() }
    }

    #else

    // MARK: - Detector

    /// FAST, no landmarks, no classification — same options as the Kotlin side.
    /// Recognition only ever needs the box.
    private lazy var detector: MLKitFaceDetection.FaceDetector = {
        let opts = FaceDetectorOptions()
        opts.performanceMode = .fast
        opts.landmarkMode = .none
        opts.classificationMode = .none
        return MLKitFaceDetection.FaceDetector.faceDetector(options: opts)
    }()

    // MARK: - Model

    private let modelLock = NSLock()
    private var interpreter: Interpreter?
    private var inputWidth = 112
    private var inputHeight = 112
    private var embeddingSize = 192

    /// Where a downloaded model lives. Application Support (not Caches): a model
    /// the app fetched once must not be evicted mid-session, and it is derived
    /// data so it stays out of iCloud backups.
    private func modelFile() throws -> URL {
        let support = try FileManager.default.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )
        let dir = support.appendingPathComponent("nitro-mlkit", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("facerec_model.tflite")
    }

    private func loadInterpreter(path: String) throws {
        let itp = try Interpreter(modelPath: path)
        try itp.allocateTensors()
        let inShape = try itp.input(at: 0).shape.dimensions   // [1, H, W, 3]
        let outShape = try itp.output(at: 0).shape.dimensions // [1, D]

        modelLock.lock()
        defer { modelLock.unlock() }
        inputHeight = inShape.count > 1 ? inShape[1] : 112
        inputWidth = inShape.count > 2 ? inShape[2] : 112
        embeddingSize = outShape.last ?? 192
        interpreter = itp
    }

    func downloadModel(url: String) throws -> Promise<Bool> {
        return Promise.async {
            guard let remote = URL(string: url) else {
                throw RuntimeError.error(withMessage: "Invalid model URL: \(url)")
            }
            let (data, response) = try await URLSession.shared.data(from: remote)
            if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
                throw RuntimeError.error(withMessage: "Model download failed: HTTP \(http.statusCode)")
            }
            var dest = try self.modelFile()
            try data.write(to: dest, options: .atomic)
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            try? dest.setResourceValues(values)
            try self.loadInterpreter(path: dest.path)
            return true
        }
    }

    func loadModel(fileUri: String) throws -> Promise<Bool> {
        return Promise.async {
            // `file://` URIs can be percent-encoded, so go through URL rather
            // than trimming the scheme by hand.
            let path: String
            if fileUri.hasPrefix("file://") {
                guard let url = URL(string: fileUri) else {
                    throw RuntimeError.error(withMessage: "Invalid model URI: \(fileUri)")
                }
                path = url.path
            } else {
                path = fileUri
            }
            guard FileManager.default.fileExists(atPath: path) else {
                throw RuntimeError.error(withMessage: "Model file not found: \(path)")
            }
            try self.loadInterpreter(path: path)
            return true
        }
    }

    func isModelReady() throws -> Bool {
        modelLock.lock()
        defer { modelLock.unlock() }
        return interpreter != nil
    }

    // MARK: - Registration

    func registerPerson(id: String, name: String, imageUri: String) throws -> Promise<Bool> {
        return Promise.async {
            guard let embedding = try await self.embedPrimaryFace(imageUri) else {
                throw RuntimeError.error(withMessage: "No face found in image")
            }
            self.store(RegisteredPerson(id: id, name: name, embedding: embedding, sampleCount: 1))
            return true
        }
    }

    func addReference(id: String, imageUri: String) throws -> Promise<Bool> {
        return Promise.async {
            guard let existing = self.person(id) else {
                throw RuntimeError.error(withMessage: "Unknown person: \(id)")
            }
            guard let embedding = try await self.embedPrimaryFace(imageUri) else {
                throw RuntimeError.error(withMessage: "No face found in image")
            }
            // Running mean over the reference photos, then re-normalised — the
            // average of unit vectors isn't one.
            let n = existing.sampleCount
            let previous = existing.embedding
            guard previous.count == embedding.count else {
                throw RuntimeError.error(withMessage: "Embedding size changed (\(previous.count) → \(embedding.count)) — was the model swapped mid-session?")
            }
            let merged = (0..<embedding.count).map { (previous[$0] * n + embedding[$0]) / (n + 1) }
            self.store(RegisteredPerson(
                id: id,
                name: existing.name,
                embedding: Self.l2normalize(merged),
                sampleCount: n + 1
            ))
            return true
        }
    }

    // MARK: - Recognition

    func findPeople(imageUri: String) throws -> Promise<[FaceSearchResult]> {
        return Promise.async {
            guard case .image(let image) = self.loadImage(from: imageUri, spec: .single),
                  let cgImage = image.cgImage else {
                throw RuntimeError.error(withMessage: "Failed to load image: \(imageUri)")
            }
            let faces = try await self.detect(image)
            var out = [FaceSearchResult]()
            for face in faces {
                guard let embedding = try self.embedFace(cgImage: cgImage, box: face.frame) else { continue }
                // No threshold here, on purpose: the single-photo API answers
                // "who does this look most like?" and lets the caller judge.
                if let match = self.bestMatch(embedding, minSim: 0) { out.append(match) }
            }
            return out
        }
    }

    func findPeopleInPhotos(imageUris: [String], options: FindPeopleOptions?) throws -> Promise<[PhotoPersonResult]> {
        return Promise.async {
            let minSim = options?.minSimilarity ?? 0.6
            let maxConcurrent = max(1, Int(options?.concurrency ?? 4))
            let spec = LoadSpec(
                targetSize: CGFloat(options?.targetSize ?? 1024),
                allowNetwork: options?.allowNetworkAccess ?? false
            )
            var results = [PhotoPersonResult]()
            results.reserveCapacity(imageUris.count)

            // Chunked task group: detection overlaps, `runModel` serialises
            // itself. A photo that fails comes back as `success: false` instead
            // of sinking the whole batch — a gallery always has a few unreadable
            // files and re-running 700 photos over one of them is not an option.
            for chunkStart in stride(from: 0, to: imageUris.count, by: maxConcurrent) {
                let chunkEnd = min(chunkStart + maxConcurrent, imageUris.count)
                let chunk = Array(imageUris[chunkStart..<chunkEnd])

                let chunkResults = await withTaskGroup(of: (Int, PhotoPersonResult).self) { group in
                    for (i, uri) in chunk.enumerated() {
                        let globalIdx = chunkStart + i
                        group.addTask {
                            do {
                                let loaded = self.loadImage(from: uri, spec: spec)
                                if case .icloud = loaded {
                                    return (globalIdx, PhotoPersonResult(index: Double(globalIdx), people: [], unknownFaces: 0, totalFaces: 0, success: false, error: "icloud"))
                                }
                                guard case .image(let image) = loaded, let cgImage = image.cgImage else {
                                    return (globalIdx, PhotoPersonResult(index: Double(globalIdx), people: [], unknownFaces: 0, totalFaces: 0, success: false, error: "load failed"))
                                }
                                let faces = try await self.detect(image)
                                var people = [FaceSearchResult]()
                                var unknown = 0.0
                                for face in faces {
                                    let embedding = try self.embedFace(cgImage: cgImage, box: face.frame)
                                    if let embedding, let match = self.bestMatch(embedding, minSim: minSim) {
                                        people.append(match)
                                    } else {
                                        unknown += 1
                                    }
                                }
                                return (globalIdx, PhotoPersonResult(index: Double(globalIdx), people: people, unknownFaces: unknown, totalFaces: Double(faces.count), success: true, error: nil))
                            } catch {
                                return (globalIdx, PhotoPersonResult(index: Double(globalIdx), people: [], unknownFaces: 0, totalFaces: 0, success: false, error: error.localizedDescription))
                            }
                        }
                    }
                    var chunkOut = [(Int, PhotoPersonResult)]()
                    for await result in group { chunkOut.append(result) }
                    return chunkOut.sorted(by: { $0.0 < $1.0 }).map(\.1)
                }
                results.append(contentsOf: chunkResults)
            }
            return results
        }
    }

    func identifyFace(faceUri: String) throws -> Promise<FaceSearchResult?> {
        return Promise.async {
            guard let embedding = try await self.embedPrimaryFace(faceUri) else { return nil }
            return self.bestMatch(embedding, minSim: 0)
        }
    }

    func extractEmbedding(faceUri: String) throws -> Promise<FaceEmbedding> {
        return Promise.async {
            guard let embedding = try await self.embedPrimaryFace(faceUri) else {
                throw RuntimeError.error(withMessage: "No face found")
            }
            return FaceEmbedding(vector: embedding)
        }
    }

    // MARK: - Internals

    private func detect(_ image: UIImage) async throws -> [Face] {
        let visionImage = VisionImage(image: image)
        // `loadImage` already redrew the image upright, so this is always `.up`
        // and the frames ML Kit returns index the CGImage's raw pixels.
        visionImage.orientation = .up
        return try await detector.process(visionImage)
    }

    /// Embedding of the largest face in the image, or nil when there is none.
    private func embedPrimaryFace(_ imageUri: String) async throws -> [Double]? {
        guard case .image(let image) = loadImage(from: imageUri, spec: .single),
              let cgImage = image.cgImage else {
            throw RuntimeError.error(withMessage: "Failed to load image: \(imageUri)")
        }
        let faces = try await detect(image)
        guard let largest = faces.max(by: { $0.frame.width * $0.frame.height < $1.frame.width * $1.frame.height }) else {
            return nil
        }
        return try embedFace(cgImage: cgImage, box: largest.frame)
    }

    private func embedFace(cgImage: CGImage, box: CGRect) throws -> [Double]? {
        let (width, height) = try modelShape()
        guard let crop = Self.crop(cgImage, to: box) else { return nil }
        guard let input = Self.inputData(from: crop, width: width, height: height) else { return nil }
        return try runModel(input)
    }

    private func modelShape() throws -> (Int, Int) {
        modelLock.lock()
        defer { modelLock.unlock() }
        guard interpreter != nil else {
            throw RuntimeError.error(withMessage: "No embedding model loaded. Call downloadModel(url) or loadModel(uri) first.")
        }
        return (inputWidth, inputHeight)
    }

    /// The one part that has to be serialised — a TFLite interpreter holds its
    /// input/output tensors, so two concurrent `invoke()`s read each other's data.
    private func runModel(_ input: Data) throws -> [Double] {
        modelLock.lock()
        defer { modelLock.unlock() }
        guard let itp = interpreter else {
            throw RuntimeError.error(withMessage: "No embedding model loaded. Call downloadModel(url) or loadModel(uri) first.")
        }
        try itp.copy(input, toInputAt: 0)
        try itp.invoke()
        let output = try itp.output(at: 0)
        let floats = output.data.withUnsafeBytes { raw in
            Array(raw.bindMemory(to: Float32.self))
        }
        return Self.l2normalize(floats.map { Double($0) })
    }

    private static func crop(_ cgImage: CGImage, to box: CGRect) -> CGImage? {
        let x = max(0, box.origin.x)
        let y = max(0, box.origin.y)
        let w = min(CGFloat(cgImage.width) - x, box.width)
        let h = min(CGFloat(cgImage.height) - y, box.height)
        guard w > 0, h > 0 else { return nil }
        return cgImage.cropping(to: CGRect(x: x, y: y, width: w, height: h))
    }

    /// Face crop → the tensor the model wants: RGB, `(px − 127.5) / 128`,
    /// `[1, H, W, 3]` row-major. Identical to the Kotlin path, so the same photo
    /// produces the same vector on both platforms.
    private static func inputData(from cgImage: CGImage, width: Int, height: Int) -> Data? {
        var rgba = [UInt8](repeating: 0, count: width * height * 4)
        let drew: Bool = rgba.withUnsafeMutableBytes { raw in
            guard let ctx = CGContext(
                data: raw.baseAddress,
                width: width,
                height: height,
                bitsPerComponent: 8,
                bytesPerRow: width * 4,
                space: CGColorSpaceCreateDeviceRGB(),
                bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
            ) else { return false }
            // Drawing into a smaller context is the resize.
            ctx.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
            return true
        }
        guard drew else { return nil }

        var floats = [Float32](repeating: 0, count: width * height * 3)
        for i in 0..<(width * height) {
            floats[i * 3] = (Float32(rgba[i * 4]) - 127.5) / 128
            floats[i * 3 + 1] = (Float32(rgba[i * 4 + 1]) - 127.5) / 128
            floats[i * 3 + 2] = (Float32(rgba[i * 4 + 2]) - 127.5) / 128
        }
        return floats.withUnsafeBufferPointer { Data(buffer: $0) }
    }

    /// How an image should be decoded: at what size, and whether iCloud may be
    /// hit for `ph://` photos whose rendition isn't cached locally.
    private struct LoadSpec {
        var targetSize: CGFloat
        var allowNetwork: Bool

        /// Single-image calls (register a reference, identify one face): the
        /// user picked that photo on purpose, so fetching it from iCloud is
        /// what they asked for.
        static let single = LoadSpec(targetSize: 1024, allowNetwork: true)
    }

    private enum LoadResult {
        case image(UIImage)
        /// `ph://` photo whose pixels live only in iCloud and the spec said no
        /// network. Distinct from `failure` so batch callers can tell the user
        /// "N photos are iCloud-only" instead of "N photos are broken".
        case icloud
        case failure
    }

    /// Loads `ph://` (PhotoKit rendition), `file://`, absolute-path or
    /// `http(s)://` images, downscaled to the spec's target size **and redrawn
    /// upright**. See notes 2 and 4 at the top of this file: without the
    /// redraw a portrait iPhone photo detects fine and crops the wrong
    /// rectangle, and without the rendition path a gallery scan downloads the
    /// full-resolution library.
    private func loadImage(from uri: String, spec: LoadSpec) -> LoadResult {
        if uri.hasPrefix("ph://") {
            return Self.loadPhotoKitImage(localIdentifier: String(uri.dropFirst(5)), spec: spec)
        }
        let image: UIImage?
        if uri.hasPrefix("file://") {
            image = URL(string: uri).flatMap { UIImage(contentsOfFile: $0.path) }
        } else if uri.hasPrefix("/") {
            image = UIImage(contentsOfFile: uri)
        } else {
            guard let url = URL(string: uri), let data = try? Data(contentsOf: url) else { return .failure }
            image = UIImage(data: data)
        }
        guard let image else { return .failure }
        return .image(Self.normalized(image, targetSize: spec.targetSize))
    }

    private static func loadPhotoKitImage(localIdentifier: String, spec: LoadSpec) -> LoadResult {
        let assets = PHAsset.fetchAssets(withLocalIdentifiers: [localIdentifier], options: nil)
        guard let asset = assets.firstObject else { return .failure }

        let options = PHImageRequestOptions()
        // Synchronous is correct here: every caller is already off the JS
        // thread inside a task group, and it's the only mode that guarantees
        // a single (non-degraded) delivery.
        options.isSynchronous = true
        options.deliveryMode = .highQualityFormat
        options.resizeMode = .fast
        options.isNetworkAccessAllowed = spec.allowNetwork

        var result: LoadResult = .failure
        PHImageManager.default().requestImage(
            for: asset,
            targetSize: CGSize(width: spec.targetSize, height: spec.targetSize),
            contentMode: .aspectFit,
            options: options
        ) { image, info in
            if let image {
                result = .image(normalized(image, targetSize: spec.targetSize))
            } else if (info?[PHImageResultIsInCloudKey] as? Bool) == true {
                result = .icloud
            }
        }
        return result
    }

    /// One redraw that applies EXIF orientation AND the downscale. Returns the
    /// image untouched when it's already upright and small enough.
    private static func normalized(_ image: UIImage, targetSize: CGFloat) -> UIImage {
        let longest = max(image.size.width, image.size.height)
        let scale = targetSize > 0 ? min(1, targetSize / longest) : 1
        if image.imageOrientation == .up && scale >= 1 { return image }

        let size = CGSize(width: (image.size.width * scale).rounded(.down),
                          height: (image.size.height * scale).rounded(.down))
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        format.opaque = true
        return UIGraphicsImageRenderer(size: size, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: size))
        }
    }

    #endif
}
