package com.margelo.nitro.nitromlkit.recognition

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Rect
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetector
import com.google.mlkit.vision.face.FaceDetectorOptions
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.tasks.await
import org.tensorflow.lite.Interpreter
import java.io.File
import java.net.URL
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.sqrt

/**
 * Native Android implementation of FaceRecognizer.
 *
 * ML Kit finds & crops faces; a TensorFlow Lite face-embedding model (provided
 * at runtime, e.g. MobileFaceNet) turns each face crop into a vector. Cosine
 * similarity against an in-memory registry answers "who is this?". Input/output
 * tensor shapes are read from the model, so 112×112 / 128-d / 192-d variants
 * all work.
 */
class HybridFaceRecognizer : HybridFaceRecognizerSpec() {

  private val detector: FaceDetector by lazy {
    FaceDetection.getClient(
      FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
        .build(),
    )
  }

  private var interpreter: Interpreter? = null
  private var inW = 112
  private var inH = 112
  private var embDim = 192

  private val registry = ConcurrentHashMap<String, RegisteredPerson>()

  // ─── Model ────────────────────────────────────────────────────────────────

  private fun modelFile(): File =
    File(NitroModules.applicationContext!!.filesDir, "facerec_model.tflite")

  private fun loadInterpreter(file: File) {
    val itp = Interpreter(file)
    val inShape = itp.getInputTensor(0).shape()   // [1, H, W, 3]
    val outShape = itp.getOutputTensor(0).shape()  // [1, D]
    inH = inShape.getOrElse(1) { 112 }
    inW = inShape.getOrElse(2) { 112 }
    embDim = outShape.last()
    interpreter?.close()
    interpreter = itp
  }

  override fun downloadModel(url: String): Promise<Boolean> {
    return Promise.async {
      val dest = modelFile()
      URL(url).openStream().use { input ->
        dest.outputStream().use { out -> input.copyTo(out) }
      }
      loadInterpreter(dest)
      true
    }
  }

  override fun loadModel(fileUri: String): Promise<Boolean> {
    return Promise.async {
      val path = when {
        fileUri.startsWith("file://") -> fileUri.removePrefix("file://")
        else -> fileUri
      }
      loadInterpreter(File(path))
      true
    }
  }

  override fun isModelReady(): Boolean = interpreter != null

  // ─── Registry ───────────────────────────────────────────────────────────

  override fun registerPerson(id: String, name: String, imageUri: String): Promise<Boolean> {
    return Promise.async {
      val emb = embedPrimaryFace(imageUri)
        ?: throw IllegalStateException("No face found in image")
      registry[id] = RegisteredPerson(id, name, emb.map { it.toDouble() }.toDoubleArray(), 1.0)
      true
    }
  }

  override fun addReference(id: String, imageUri: String): Promise<Boolean> {
    return Promise.async {
      val existing = registry[id] ?: throw IllegalStateException("Unknown person: $id")
      val emb = embedPrimaryFace(imageUri)
        ?: throw IllegalStateException("No face found in image")
      val n = existing.sampleCount
      val merged = DoubleArray(emb.size) { i -> (existing.embedding[i] * n + emb[i]) / (n + 1) }
      registry[id] = RegisteredPerson(id, existing.name, l2normalize(merged), n + 1)
      true
    }
  }

  override fun removePerson(id: String) { registry.remove(id) }

  override fun clearRegistry() { registry.clear() }

  override fun getRegistry(): Array<RegisteredPerson> = registry.values.toTypedArray()

  // ─── Recognition ──────────────────────────────────────────────────────────

  override fun findPeople(imageUri: String): Promise<Array<FaceSearchResult>> {
    return Promise.async {
      val bitmap = loadBitmap(imageUri) ?: throw IllegalStateException("Failed to load: $imageUri")
      val faces = detector.process(InputImage.fromBitmap(bitmap, 0)).await()
      faces.mapNotNull { face ->
        val emb = embedFace(bitmap, face) ?: return@mapNotNull null
        bestMatch(emb, 0.0)
      }.toTypedArray()
    }
  }

  override fun findPeopleInPhotos(
    imageUris: Array<String>,
    options: FindPeopleOptions?,
  ): Promise<Array<PhotoPersonResult>> {
    return Promise.async {
      val minSim = options?.minSimilarity ?: 0.6
      val results = arrayOfNulls<PhotoPersonResult>(imageUris.size)
      for ((idx, uri) in imageUris.withIndex()) {
        try {
          val bitmap = loadBitmap(uri)
          if (bitmap == null) {
            results[idx] = PhotoPersonResult(idx.toDouble(), emptyArray(), 0.0, 0.0, false, "load failed")
            continue
          }
          val faces = detector.process(InputImage.fromBitmap(bitmap, 0)).await()
          val people = ArrayList<FaceSearchResult>()
          var unknown = 0
          for (face in faces) {
            val emb = embedFace(bitmap, face)
            val match = if (emb != null) bestMatch(emb, minSim) else null
            if (match != null) people.add(match) else unknown++
          }
          results[idx] = PhotoPersonResult(
            idx.toDouble(), people.toTypedArray(), unknown.toDouble(), faces.size.toDouble(), true, null,
          )
        } catch (e: Exception) {
          results[idx] = PhotoPersonResult(idx.toDouble(), emptyArray(), 0.0, 0.0, false, e.message)
        }
      }
      results.map { it!! }.toTypedArray()
    }
  }

  override fun identifyFace(faceUri: String): Promise<FaceSearchResult?> {
    return Promise.async {
      val emb = embedPrimaryFace(faceUri) ?: return@async null
      bestMatch(emb, 0.0)
    }
  }

  override fun extractEmbedding(faceUri: String): Promise<FaceEmbedding> {
    return Promise.async {
      val emb = embedPrimaryFace(faceUri) ?: throw IllegalStateException("No face found")
      FaceEmbedding(emb.map { it.toDouble() }.toDoubleArray())
    }
  }

  override fun compare(embedding1: DoubleArray, embedding2: DoubleArray): Double =
    cosine(embedding1, embedding2).coerceIn(0.0, 1.0)

  // ─── Internals ──────────────────────────────────────────────────────────

  private fun bestMatch(emb: DoubleArray, minSim: Double): FaceSearchResult? {
    var best: RegisteredPerson? = null
    var bestSim = -1.0
    for (person in registry.values) {
      val sim = cosine(emb, person.embedding)
      if (sim > bestSim) { bestSim = sim; best = person }
    }
    val p = best ?: return null
    val score = bestSim.coerceIn(0.0, 1.0)
    return if (score >= minSim) FaceSearchResult(p, score) else null
  }

  private suspend fun embedPrimaryFace(imageUri: String): DoubleArray? {
    val bitmap = loadBitmap(imageUri) ?: return null
    val faces = detector.process(InputImage.fromBitmap(bitmap, 0)).await()
    val largest = faces.maxByOrNull { it.boundingBox.width() * it.boundingBox.height() } ?: return null
    return embedFace(bitmap, largest)
  }

  private fun embedFace(bitmap: Bitmap, face: Face): DoubleArray? {
    val itp = interpreter ?: throw IllegalStateException(
      "No embedding model loaded. Call downloadModel(url) or loadModel(uri) first.",
    )
    val crop = cropFace(bitmap, face.boundingBox) ?: return null
    val resized = Bitmap.createScaledBitmap(crop, inW, inH, true)

    val input = Array(1) { Array(inH) { Array(inW) { FloatArray(3) } } }
    val px = IntArray(inW * inH)
    resized.getPixels(px, 0, inW, 0, 0, inW, inH)
    for (y in 0 until inH) {
      for (x in 0 until inW) {
        val p = px[y * inW + x]
        input[0][y][x][0] = (((p shr 16) and 0xFF) - 127.5f) / 128f
        input[0][y][x][1] = (((p shr 8) and 0xFF) - 127.5f) / 128f
        input[0][y][x][2] = ((p and 0xFF) - 127.5f) / 128f
      }
    }
    val output = Array(1) { FloatArray(embDim) }
    itp.run(input, output)
    return l2normalize(DoubleArray(embDim) { output[0][it].toDouble() })
  }

  private fun cropFace(bitmap: Bitmap, box: Rect): Bitmap? {
    val x = box.left.coerceAtLeast(0)
    val y = box.top.coerceAtLeast(0)
    val w = box.width().coerceAtMost(bitmap.width - x)
    val h = box.height().coerceAtMost(bitmap.height - y)
    if (w <= 0 || h <= 0) return null
    return Bitmap.createBitmap(bitmap, x, y, w, h)
  }

  private fun l2normalize(v: DoubleArray): DoubleArray {
    var mag = 0.0
    for (e in v) mag += e * e
    mag = sqrt(mag)
    return if (mag > 0) DoubleArray(v.size) { v[it] / mag } else v
  }

  private fun cosine(a: DoubleArray, b: DoubleArray): Double {
    if (a.size != b.size || a.isEmpty()) return 0.0
    var dot = 0.0; var ma = 0.0; var mb = 0.0
    for (i in a.indices) { dot += a[i] * b[i]; ma += a[i] * a[i]; mb += b[i] * b[i] }
    val denom = sqrt(ma) * sqrt(mb)
    return if (denom > 0) dot / denom else 0.0
  }

  private fun loadBitmap(uri: String): Bitmap? {
    return try {
      when {
        uri.startsWith("file://") -> BitmapFactory.decodeFile(uri.removePrefix("file://"))
        uri.startsWith("/") -> BitmapFactory.decodeFile(uri)
        uri.startsWith("content://") -> {
          val cr = NitroModules.applicationContext!!.contentResolver
          cr.openInputStream(android.net.Uri.parse(uri)).use { BitmapFactory.decodeStream(it) }
        }
        else -> URL(uri).openStream().use { BitmapFactory.decodeStream(it) }
      }
    } catch (e: Exception) {
      null
    }
  }
}
