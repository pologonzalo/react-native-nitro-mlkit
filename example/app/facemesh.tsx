import { NitroFaceMesh } from "@nitro-mlkit/face-mesh";
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

const SAMPLE = "https://randomuser.me/api/portraits/women/44.jpg";
const dir = new Directory(Paths.document, "facemesh");

async function download(): Promise<string> {
  if (!dir.exists) dir.create();
  const dest = new File(dir, "sample.jpg");
  if (dest.exists) dest.delete();
  await File.downloadFileAsync(SAMPLE, dest);
  return dest.uri;
}

export default function FaceMeshScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [points, setPoints] = useState<any[]>([]);
  const [status, setStatus] = useState("Detect a sample");
  const [loading, setLoading] = useState(false);

  async function detect() {
    setLoading(true);
    setPoints([]);
    setStatus("Downloading…");
    try {
      const uri = await download();
      setImageUri(uri);
      setStatus("Detecting…");
      const t = Date.now();
      const found = await NitroFaceMesh.detect(uri);
      setPoints(found);
      setStatus(`${found.length} mesh point(s) in ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>@nitro-mlkit/face-mesh</Text>
      <Text style={s.subtitle}>On-device • 468 3D points • Nitro batch</Text>
      <Pressable style={s.btn} onPress={detect} disabled={loading}>
        <Text style={s.btnText}>Detect sample</Text>
      </Pressable>
      {imageUri && <Image source={{ uri: imageUri }} style={s.preview} resizeMode="contain" />}
      <View style={s.statusRow}>
        {loading && <ActivityIndicator color="#e11d48" />}
        <Text style={s.status}>{status}</Text>
      </View>
      {points.slice(0, 6).map((p, i) => (
        <View key={i} style={s.row}>
          <Text style={s.rowLabel}>point {p.index}</Text>
          <Text style={s.rowValue}>
            ({p.x.toFixed(1)}, {p.y.toFixed(1)}, {p.z.toFixed(1)})
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
  btn: { backgroundColor: "#e11d48", padding: 14, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  preview: { width: "100%", height: 260, borderRadius: 12, marginVertical: 16 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 16 },
  status: { color: "#ffd700", fontSize: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#222" },
  rowLabel: { color: "#fff", fontSize: 14 },
  rowValue: { color: "#fb7185", fontSize: 13 },
});
