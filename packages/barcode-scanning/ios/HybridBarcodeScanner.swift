import Foundation
import UIKit
import NitroModules
import MLKitBarcodeScanning
import MLKitVision

/**
 * Native iOS implementation of BarcodeScanner.
 * Conforms to the Nitrogen-generated HybridBarcodeScannerSpec protocol.
 *
 * Uses MLKit's bundled barcode-scanning model (all 1D/2D symbologies).
 * Mirrors the Android (Kotlin) implementation's format / valueType string
 * mapping so results are identical across platforms.
 */
class HybridBarcodeScanner: HybridBarcodeScannerSpec {

    // MARK: - HybridObject boilerplate
    var memorySize: Int { MemoryLayout<HybridBarcodeScanner>.size }

    // Disambiguate the MLKit `Barcode` class from the Nitro `Barcode` struct.
    private typealias MLBarcode = MLKitBarcodeScanning.Barcode

    // Default scanner detects all supported formats; reused across calls.
    private lazy var scanner: BarcodeScanner = BarcodeScanner.barcodeScanner()

    // MARK: - Spec methods

    func scan(imageUri: String) throws -> Promise<[Barcode]> {
        return Promise.async {
            return try await self.scanImage(imageUri)
        }
    }

    func scanFirst(imageUri: String) throws -> Promise<Barcode?> {
        return Promise.async {
            return try await self.scanImage(imageUri).first
        }
    }

    func scanBatch(imageUris: [String], concurrency: Double) throws -> Promise<[BatchScanResult]> {
        return Promise.async {
            let maxConcurrent = max(1, Int(concurrency))
            var results = [BatchScanResult]()
            results.reserveCapacity(imageUris.count)

            for chunkStart in stride(from: 0, to: imageUris.count, by: maxConcurrent) {
                let chunkEnd = min(chunkStart + maxConcurrent, imageUris.count)
                let chunk = Array(imageUris[chunkStart..<chunkEnd])

                let chunkResults = await withTaskGroup(of: (Int, BatchScanResult).self) { group in
                    for (i, uri) in chunk.enumerated() {
                        let globalIdx = chunkStart + i
                        group.addTask {
                            do {
                                let barcodes = try await self.scanImage(uri)
                                return (globalIdx, BatchScanResult(index: Double(globalIdx), barcodes: barcodes, success: true, error: nil))
                            } catch {
                                return (globalIdx, BatchScanResult(index: Double(globalIdx), barcodes: [], success: false, error: error.localizedDescription))
                            }
                        }
                    }
                    var out = [(Int, BatchScanResult)]()
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

    private func scanImage(_ uri: String) async throws -> [Barcode] {
        guard let image = loadImage(from: uri) else {
            throw RuntimeError.error(withMessage: "Failed to load image: \(uri)")
        }
        let visionImage = VisionImage(image: image)
        visionImage.orientation = image.imageOrientation
        let mlBarcodes = try await scanner.process(visionImage)
        return mlBarcodes.map { mapBarcode($0) }
    }

    private func mapBarcode(_ b: MLBarcode) -> Barcode {
        let raw = b.rawValue ?? ""
        let box = b.frame
        return Barcode(
            rawValue: raw,
            displayValue: b.displayValue ?? raw,
            format: formatName(b.format),
            valueType: valueTypeName(b.valueType),
            bounds: BarcodeBounds(
                x: Double(box.origin.x),
                y: Double(box.origin.y),
                width: Double(box.width),
                height: Double(box.height)
            )
        )
    }

    /// Maps MLKit's `BarcodeFormat` (an OptionSet on iOS) to the same uppercase
    /// strings the Kotlin implementation emits. A detected barcode carries a
    /// single format bit, so `contains(_:)` acts as an equality check here.
    private func formatName(_ format: BarcodeFormat) -> String {
        if format.contains(.code128) { return "CODE_128" }
        if format.contains(.code39) { return "CODE_39" }
        if format.contains(.code93) { return "CODE_93" }
        if format.contains(.codaBar) { return "CODABAR" }
        if format.contains(.dataMatrix) { return "DATA_MATRIX" }
        if format.contains(.EAN13) { return "EAN_13" }
        if format.contains(.EAN8) { return "EAN_8" }
        if format.contains(.ITF) { return "ITF" }
        if format.contains(.qrCode) { return "QR_CODE" }
        if format.contains(.UPCA) { return "UPC_A" }
        if format.contains(.UPCE) { return "UPC_E" }
        if format.contains(.PDF417) { return "PDF417" }
        if format.contains(.aztec) { return "AZTEC" }
        return "UNKNOWN"
    }

    private func valueTypeName(_ type: BarcodeValueType) -> String {
        switch type {
        case .contactInfo: return "CONTACT_INFO"
        case .email: return "EMAIL"
        case .ISBN: return "ISBN"
        case .phone: return "PHONE"
        case .product: return "PRODUCT"
        case .SMS: return "SMS"
        case .text: return "TEXT"
        case .URL: return "URL"
        case .wiFi: return "WIFI"
        case .geographicCoordinates: return "GEO"
        case .calendarEvent: return "CALENDAR_EVENT"
        case .driversLicense: return "DRIVER_LICENSE"
        default: return "UNKNOWN"
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
