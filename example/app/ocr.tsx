import { NitroText } from "@nitro-mlkit/text-recognition";
import { Directory, File, Paths } from "expo-file-system";
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

// Deterministic text image (downloaded once, then OCR'd). Known content:
// "Hello Nitro MLKit".
const SAMPLE = "https://dummyimage.com/1000x300/ffffff/000000.png&text=Hello+Nitro+MLKit";

const dir = new Directory(Paths.document, "ocr");

async function download(name: string, url: string): Promise<string> {
  if (!dir.exists) dir.create();
  const dest = new File(dir, name);
  if (dest.exists) dest.delete();
  await File.downloadFileAsync(url, dest);
  return dest.uri;
}

export default function OcrScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [meta, setMeta] = useState("");
  const [status, setStatus] = useState("Recognize a sample");
  const [loading, setLoading] = useState(false);

  async function recognize() {
    setLoading(true);
    setText("");
    setMeta("");
    setStatus("Downloading…");
    try {
      const uri = await download("sample.png", SAMPLE);
      setImageUri(uri);
      setStatus("Recognizing…");
      const t = Date.now();
      const result = await NitroText.recognize(uri);
      const lines = result.blocks.reduce((n, b) => n + b.lines.length, 0);
      setText(result.text);
      setMeta(`${result.blocks.length} block(s), ${lines} line(s) · ${Date.now() - t} ms`);
      setStatus("Done ✅");
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  async function batch() {
    setLoading(true);
    setStatus("Batch 20×…");
    try {
      const uri = await download("sample.png", SAMPLE);
      setImageUri(uri);
      const uris = Array(20).fill(uri);
      const t = Date.now();
      const results = await NitroText.recognizeBatch(uris, 4);
      const ok = results.filter((r) => r.success).length;
      Alert.alert(
        "Batch complete",
        `20 images, ${ok} recognized — ONE bridge call, ${Date.now() - t} ms`,
      );
      setStatus(`Batch: ${ok}/20 in ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>@nitro-mlkit/text-recognition</Text>
      <Text style={s.subtitle}>On-device OCR • blocks/lines • Nitro batch</Text>

      <View style={s.actions}>
        <Pressable style={s.btnPrimary} onPress={recognize} disabled={loading}>
          <Text style={s.btnText}>Recognize sample</Text>
        </Pressable>
        <Pressable style={s.btnAccent} onPress={batch} disabled={loading}>
          <Text style={s.btnText}>Batch (20×) 🚀</Text>
        </Pressable>
      </View>

      {imageUri && (
        <Image source={{ uri: imageUri }} style={s.preview} resizeMode="contain" />
      )}

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color="#db2777" />}
        <Text style={s.status}>{status}</Text>
      </View>

      {!!text && (
        <View style={s.card}>
          <Text style={s.meta}>{meta}</Text>
          <Text style={s.recognized}>{text}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A1A" },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: "bold", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#888", textAlign: "center", marginBottom: 20 },
  actions: { gap: 8 },
  btnPrimary: { backgroundColor: "#db2777", padding: 14, borderRadius: 10, alignItems: "center" },
  btnAccent: { backgroundColor: "#22c55e", padding: 14, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  preview: { width: "100%", height: 160, borderRadius: 12, marginVertical: 16, backgroundColor: "#fff" },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 16 },
  status: { color: "#ffd700", fontSize: 14 },
  card: { backgroundColor: "#1a1a2e", padding: 14, borderRadius: 8 },
  meta: { color: "#60a5fa", fontSize: 12, marginBottom: 8 },
  recognized: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
