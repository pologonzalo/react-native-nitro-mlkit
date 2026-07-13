package com.nitromlkit.face

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Rect
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceDetection as MLKitFaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import com.google.mlkit.vision.face.FaceLandmark as MLKitFaceLandmark
import com.margelo.nitro.NitroModules
import kotlinx.coroutines.*
import kotlinx.coroutines.tasks.await
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

/**
 * Native Android implementation of the FaceDetector HybridObject.
 * Uses Google ML Kit for face detection (on-device, free, no Firebase required).
 */
class HybridFaceDetector : HybridFaceDetectorSpec() {

    private val fastDetector by lazy {
        val options = FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
            .build()
        MLKitFaceDetection.getClient(options)
    }

    private val accurateDetector by lazy {
        val options = FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
            .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
            .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
            .build()
        MLKitFaceDetection.getClient(options)
    }

    override suspend fun detect(imageUri: String, options: FaceDetectionOptions?): List<DetectedFace> {
        val bitmap = loadBitmap(imageUri) ?: throw Error("Failed to load image: $imageUri")
        val inputImage = InputImage.fromBitmap(bitmap, 0)
        
        val detector = if (options?.performanceMode == "accurate") accurateDetector else fastDetector
        val faces = detector.process(inputImage).await()
        
        return faces.map { mapFace(it, options) }
    }

    override suspend fun detectBatch(imageUris: List<String>, options: BatchOptions?): List<BatchCropResult> {
        val concurrency = options?.concurrency ?: 4
        
        return withContext(Dispatchers.Default) {
            val semaphore = kotlinx.coroutines.sync.Semaphore(concurrency)
            
            imageUris.mapIndexed { index, uri ->
                async {
                    semaphore.acquire()
                    try {
                        val faces = detect(uri, options)
                        val crops = if (options?.cropFaces == true) {
                            cropFacesInternal(uri, faces, options.cropPadding ?: 0.3)
                        } else emptyList()
                        
                        BatchCropResult(
                            index = index,
                            faces = faces,
                            crops = crops,
                            success = true,
                            error = null
                        )
                    } catch (e: Exception) {
                        BatchCropResult(
                            index = index,
                            faces = emptyList(),
                            crops = emptyList(),
                            success = false,
                            error = e.message
                        )
                    } finally {
                        semaphore.release()
                    }
                }
            }.awaitAll()
        }
    }

    override suspend fun detectPrimary(imageUri: String, options: FaceDetectionOptions?): DetectedFace? {
        val faces = detect(imageUri, options)
        return faces.maxByOrNull { it.bounds.width * it.bounds.height }
    }

    override suspend fun cropFaces(imageUri: String, options: FaceDetectionOptions?, padding: Double?): List<CroppedFace> {
        val faces = detect(imageUri, options)
        return cropFacesInternal(imageUri, faces, padding ?: 0.3)
    }

    override fun isAvailable(): Boolean = true

    // --- Private helpers ---

    private fun loadBitmap(uri: String): Bitmap? {
        return try {
            val path = when {
                uri.startsWith("file://") -> uri.removePrefix("file://")
                uri.startsWith("/") -> uri
                else -> Uri.parse(uri).path ?: return null
            }
            BitmapFactory.decodeFile(path)
        } catch (e: Exception) {
            null
        }
    }

    private fun mapFace(face: Face, options: FaceDetectionOptions?): DetectedFace {
        val landmarks = if (options?.landmarks == true) mapLandmarks(face) else emptyList()
        
        return DetectedFace(
            bounds = FaceBounds(
                x = face.boundingBox.left.toDouble(),
                y = face.boundingBox.top.toDouble(),
                width = face.boundingBox.width().toDouble(),
                height = face.boundingBox.height().toDouble()
            ),
            headEulerAngleY = face.headEulerAngleY.toDouble(),
            headEulerAngleZ = face.headEulerAngleZ.toDouble(),
            leftEyeOpenProbability = (face.leftEyeOpenProbability ?: -1f).toDouble(),
            rightEyeOpenProbability = (face.rightEyeOpenProbability ?: -1f).toDouble(),
            smilingProbability = (face.smilingProbability ?: -1f).toDouble(),
            landmarks = landmarks,
            trackingId = face.trackingId ?: -1
        )
    }

    private fun mapLandmarks(face: Face): List<FaceLandmark> {
        val pairs = listOf(
            "leftEye" to MLKitFaceLandmark.LEFT_EYE,
            "rightEye" to MLKitFaceLandmark.RIGHT_EYE,
            "leftEar" to MLKitFaceLandmark.LEFT_EAR,
            "rightEar" to MLKitFaceLandmark.RIGHT_EAR,
            "leftCheek" to MLKitFaceLandmark.LEFT_CHEEK,
            "rightCheek" to MLKitFaceLandmark.RIGHT_CHEEK,
            "noseBase" to MLKitFaceLandmark.NOSE_BASE,
            "mouthLeft" to MLKitFaceLandmark.MOUTH_LEFT,
            "mouthRight" to MLKitFaceLandmark.MOUTH_RIGHT,
            "mouthBottom" to MLKitFaceLandmark.MOUTH_BOTTOM,
        )
        return pairs.mapNotNull { (type, mlType) ->
            face.getLandmark(mlType)?.let { lm ->
                FaceLandmark(type = type, x = lm.position.x.toDouble(), y = lm.position.y.toDouble())
            }
        }
    }

    private fun cropFacesInternal(imageUri: String, faces: List<DetectedFace>, padding: Double): List<CroppedFace> {
        val bitmap = loadBitmap(imageUri) ?: return emptyList()
        val imgW = bitmap.width.toDouble()
        val imgH = bitmap.height.toDouble()
        
        return faces.mapIndexedNotNull { index, face ->
            val padX = (face.bounds.width * padding).toInt()
            val padY = (face.bounds.height * padding).toInt()
            
            val x = maxOf(0, face.bounds.x.toInt() - padX)
            val y = maxOf(0, face.bounds.y.toInt() - padY)
            val w = minOf(imgW.toInt() - x, face.bounds.width.toInt() + padX * 2)
            val h = minOf(imgH.toInt() - y, face.bounds.height.toInt() + padY * 2)
            
            if (w <= 0 || h <= 0) return@mapIndexedNotNull null
            
            try {
                val cropped = Bitmap.createBitmap(bitmap, x, y, w, h)
                val tempFile = File.createTempFile("nitro_face_${UUID.randomUUID()}", ".jpg")
                FileOutputStream(tempFile).use { out ->
                    cropped.compress(Bitmap.CompressFormat.JPEG, 80, out)
                }
                cropped.recycle()
                
                CroppedFace(
                    uri = "file://${tempFile.absolutePath}",
                    faceIndex = index,
                    width = w,
                    height = h
                )
            } catch (e: Exception) {
                null
            }
        }.also {
            bitmap.recycle()
        }
    }
}
