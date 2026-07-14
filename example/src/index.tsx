import { NitroFace, PerformanceMode } from "@nitro-mlkit/face-detection";
import * as ImagePicker from "expo-image-picker";
import { Link } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function HomeScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [faces, setFaces] = useState<any[]>([]);
  const [crops, setCrops] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setFaces([]);
      setCrops([]);
    }
  }

  async function detectFaces() {
    if (!imageUri) return;
    setLoading(true);
    try {
      const detected = await NitroFace.detect(imageUri, {
        performanceMode: PerformanceMode.ACCURATE,
        landmarks: true,
        classifications: true,
        minFaceSize: 0.1,
        tracking: false,
      });
      setFaces(detected);
      Alert.alert("Detected", `Found ${detected.length} face(s)`);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  async function cropAllFaces() {
    if (!imageUri) return;
    setLoading(true);
    try {
      const croppedFaces = await NitroFace.cropFaces(imageUri, 0.3);
      setCrops(croppedFaces.map((c) => c.uri));
      Alert.alert("Cropped", `Got ${croppedFaces.length} face crop(s)`);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  async function testBatch() {
    if (!imageUri) return;
    setLoading(true);
    try {
      // Simulate batch with the same image 10 times
      const uris = Array(10).fill(imageUri);
      const results = await NitroFace.detectBatch(uris, 4);
      const totalFaces = results.reduce((sum, r) => sum + r.faces.length, 0);
      Alert.alert(
        "Batch Complete",
        `Processed ${results.length} images, found ${totalFaces} total faces.\nAll in ONE bridge call!`,
      );
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>@nitro-mlkit/face-detection</Text>
      <Text style={s.subtitle}>On-device • Zero bridge overhead • Batch</Text>

      <Pressable style={s.btn} onPress={pickImage}>
        <Text style={s.btnText}>Pick Image</Text>
      </Pressable>

      <Link href="/benchmark" asChild>
        <Pressable style={s.btnBench}>
          <Text style={s.btnText}>⏱️ Benchmark vs RN-ML-Kit</Text>
        </Pressable>
      </Link>

      <Link href="/labeling" asChild>
        <Pressable style={s.btnLabel}>
          <Text style={s.btnText}>🏷️ Image Labeling</Text>
        </Pressable>
      </Link>

      <Link href="/barcode" asChild>
        <Pressable style={s.btnBarcode}>
          <Text style={s.btnText}>🔳 Barcode / QR Scanning</Text>
        </Pressable>
      </Link>

      <Link href="/ocr" asChild>
        <Pressable style={s.btnOcr}>
          <Text style={s.btnText}>🔤 Text Recognition (OCR)</Text>
        </Pressable>
      </Link>

      <Link href="/objects" asChild>
        <Pressable style={s.btnObjects}>
          <Text style={s.btnText}>📦 Object Detection</Text>
        </Pressable>
      </Link>

      <Link href="/pose" asChild>
        <Pressable style={s.btnPose}>
          <Text style={s.btnText}>🧍 Pose Detection</Text>
        </Pressable>
      </Link>

      <Link href="/langid" asChild>
        <Pressable style={s.btnLangId}>
          <Text style={s.btnText}>🌐 Language ID</Text>
        </Pressable>
      </Link>

      <Link href="/facemesh" asChild>
        <Pressable style={s.btnMesh}>
          <Text style={s.btnText}>🕸️ Face Mesh</Text>
        </Pressable>
      </Link>

      <Link href="/selfieseg" asChild>
        <Pressable style={s.btnSeg}>
          <Text style={s.btnText}>✂️ Selfie Segmentation</Text>
        </Pressable>
      </Link>

      {imageUri && (
        <Image
          source={{ uri: imageUri }}
          style={s.preview}
          resizeMode="contain"
        />
      )}

      {imageUri && (
        <View style={s.actions}>
          <Pressable
            style={[s.btn, s.btnPrimary]}
            onPress={detectFaces}
            disabled={loading}
          >
            <Text style={s.btnText}>Detect Faces</Text>
          </Pressable>

          <Pressable
            style={[s.btn, s.btnPrimary]}
            onPress={cropAllFaces}
            disabled={loading}
          >
            <Text style={s.btnText}>Crop Faces</Text>
          </Pressable>

          <Pressable
            style={[s.btn, s.btnAccent]}
            onPress={testBatch}
            disabled={loading}
          >
            <Text style={s.btnText}>Batch (10x) 🚀</Text>
          </Pressable>
        </View>
      )}

      {faces.length > 0 && (
        <View style={s.results}>
          <Text style={s.resultsTitle}>Detected {faces.length} face(s):</Text>
          {faces.map((face, i) => (
            <View key={i} style={s.faceCard}>
              <Text style={s.faceText}>Face {i + 1}</Text>
              <Text style={s.faceDetail}>
                Smile: {(face.smilingProbability * 100).toFixed(0)}%
              </Text>
              <Text style={s.faceDetail}>
                Left eye open: {(face.leftEyeOpenProbability * 100).toFixed(0)}%
              </Text>
              <Text style={s.faceDetail}>
                Size: {face.bounds.width.toFixed(0)}x
                {face.bounds.height.toFixed(0)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {crops.length > 0 && (
        <View style={s.results}>
          <Text style={s.resultsTitle}>Cropped faces:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {crops.map((uri, i) => (
              <Image key={i} source={{ uri }} style={s.cropImg} />
            ))}
          </ScrollView>
        </View>
      )}

      {loading && <Text style={s.loading}>Processing...</Text>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A1A" },
  content: { padding: 20, paddingTop: 60 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginBottom: 24,
  },
  btn: {
    backgroundColor: "#222",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 6,
  },
  btnPrimary: { backgroundColor: "#1a6dff" },
  btnAccent: { backgroundColor: "#22c55e" },
  btnBench: {
    backgroundColor: "#7c3aed",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 6,
  },
  btnLabel: {
    backgroundColor: "#0891b2",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 6,
  },
  btnBarcode: {
    backgroundColor: "#d97706",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 6,
  },
  btnOcr: {
    backgroundColor: "#db2777",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 6,
  },
  btnObjects: {
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 6,
  },
  btnPose: {
    backgroundColor: "#7c3aed",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 6,
  },
  btnLangId: {
    backgroundColor: "#0ea5e9",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 6,
  },
  btnMesh: {
    backgroundColor: "#e11d48",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 6,
  },
  btnSeg: {
    backgroundColor: "#0d9488",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 6,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  preview: { width: "100%", height: 300, borderRadius: 12, marginVertical: 16 },
  actions: { gap: 8 },
  results: { marginTop: 20 },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 10,
  },
  faceCard: {
    backgroundColor: "#1a1a2e",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  faceText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  faceDetail: { color: "#aaa", fontSize: 13, marginTop: 2 },
  cropImg: { width: 100, height: 100, borderRadius: 8, marginRight: 10 },
  loading: {
    color: "#ffd700",
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
  },
});
