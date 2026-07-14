import { NitroLabeler } from "@nitro-mlkit/image-labeling";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Label = { text: string; confidence: number; index: number };

export default function LabelingScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [status, setStatus] = useState("Pick an image to label");
  const [loading, setLoading] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setLabels([]);
      setStatus("Ready — tap Label");
    }
  }

  async function label() {
    if (!imageUri) return;
    setLoading(true);
    setStatus("Labeling…");
    try {
      const t = Date.now();
      const result = await NitroLabeler.label(imageUri, {
        confidenceThreshold: 0.5,
        maxLabels: 10,
      });
      setLabels(result);
      setStatus(`${result.length} label(s) in ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  async function labelBatch() {
    if (!imageUri) return;
    setLoading(true);
    setStatus("Batch labeling 20×…");
    try {
      const uris = Array(20).fill(imageUri);
      const t = Date.now();
      const results = await NitroLabeler.labelBatch(uris, { concurrency: 4 });
      const total = results.reduce((n, r) => n + r.labels.length, 0);
      Alert.alert(
        "Batch complete",
        `20 images, ${total} labels — ONE bridge call, ${Date.now() - t} ms`,
      );
      setStatus(`Batch: ${total} labels in ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>@nitro-mlkit/image-labeling</Text>
      <Text style={s.subtitle}>On-device • 400+ labels • Nitro batch</Text>

      <Pressable style={s.btn} onPress={pickImage}>
        <Text style={s.btnText}>Pick Image</Text>
      </Pressable>

      {imageUri && (
        <Image source={{ uri: imageUri }} style={s.preview} resizeMode="contain" />
      )}

      {imageUri && (
        <View style={s.actions}>
          <Pressable style={s.btnPrimary} onPress={label} disabled={loading}>
            <Text style={s.btnText}>Label</Text>
          </Pressable>
          <Pressable style={s.btnAccent} onPress={labelBatch} disabled={loading}>
            <Text style={s.btnText}>Batch (20×) 🚀</Text>
          </Pressable>
        </View>
      )}

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color="#0891b2" />}
        <Text style={s.status}>{status}</Text>
      </View>

      {labels.map((l, i) => (
        <View key={i} style={s.row}>
          <Text style={s.rowLabel}>{l.text}</Text>
          <Text style={s.rowValue}>{(l.confidence * 100).toFixed(1)}%</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A1A" },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "bold", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#888", textAlign: "center", marginBottom: 20 },
  btn: { backgroundColor: "#222", padding: 14, borderRadius: 10, alignItems: "center", marginVertical: 6 },
  btnPrimary: { backgroundColor: "#0891b2", padding: 14, borderRadius: 10, alignItems: "center", marginVertical: 6 },
  btnAccent: { backgroundColor: "#22c55e", padding: 14, borderRadius: 10, alignItems: "center", marginVertical: 6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  preview: { width: "100%", height: 280, borderRadius: 12, marginVertical: 16 },
  actions: { gap: 8 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 16 },
  status: { color: "#ffd700", fontSize: 14 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222",
  },
  rowLabel: { color: "#fff", fontSize: 15, textTransform: "capitalize" },
  rowValue: { color: "#4ade80", fontSize: 15, fontWeight: "700" },
});
