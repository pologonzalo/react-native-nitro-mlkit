import { NitroObjects } from "@nitro-mlkit/object-detection";
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

const SAMPLE = "https://randomuser.me/api/portraits/men/32.jpg";
const dir = new Directory(Paths.document, "objects");

async function download(): Promise<string> {
  if (!dir.exists) dir.create();
  const dest = new File(dir, "sample.jpg");
  if (dest.exists) dest.delete();
  await File.downloadFileAsync(SAMPLE, dest);
  return dest.uri;
}

export default function ObjectsScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [objects, setObjects] = useState<any[]>([]);
  const [status, setStatus] = useState("Detect a sample");
  const [loading, setLoading] = useState(false);

  async function detect() {
    setLoading(true);
    setObjects([]);
    setStatus("Downloading…");
    try {
      const uri = await download();
      setImageUri(uri);
      setStatus("Detecting…");
      const t = Date.now();
      const found = await NitroObjects.detect(uri);
      setObjects(found);
      setStatus(`${found.length} object(s) in ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>@nitro-mlkit/object-detection</Text>
      <Text style={s.subtitle}>On-device • boxes + labels • Nitro batch</Text>
      <Pressable style={s.btn} onPress={detect} disabled={loading}>
        <Text style={s.btnText}>Detect sample</Text>
      </Pressable>
      {imageUri && <Image source={{ uri: imageUri }} style={s.preview} resizeMode="contain" />}
      <View style={s.statusRow}>
        {loading && <ActivityIndicator color="#16a34a" />}
        <Text style={s.status}>{status}</Text>
      </View>
      {objects.map((o, i) => (
        <View key={i} style={s.card}>
          <Text style={s.cardTitle}>
            Object {i + 1}{o.trackingId >= 0 ? ` (id ${o.trackingId})` : ""}
          </Text>
          <Text style={s.detail}>
            {o.labels.length
              ? o.labels.map((l: any) => `${l.text} ${(l.confidence * 100).toFixed(0)}%`).join(", ")
              : "no label"}
          </Text>
          <Text style={s.detail}>
            box {o.bounds.width.toFixed(0)}×{o.bounds.height.toFixed(0)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A1A" },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: "bold", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#888", textAlign: "center", marginBottom: 20 },
  btn: { backgroundColor: "#16a34a", padding: 14, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  preview: { width: "100%", height: 260, borderRadius: 12, marginVertical: 16 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 16 },
  status: { color: "#ffd700", fontSize: 14 },
  card: { backgroundColor: "#1a1a2e", padding: 12, borderRadius: 8, marginBottom: 8 },
  cardTitle: { color: "#fff", fontSize: 15, fontWeight: "600" },
  detail: { color: "#aaa", fontSize: 13, marginTop: 2 },
});
