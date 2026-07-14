import { NitroPose } from "@nitro-mlkit/pose-detection";
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

// A half-body-ish portrait; MLKit pose returns all 33 landmarks when it finds
// a body (below-frame joints come back with low inFrameLikelihood).
const SAMPLE = "https://randomuser.me/api/portraits/men/32.jpg";
const dir = new Directory(Paths.document, "pose");

// A few well-known landmark type indices for a readable summary.
const NAMES: Record<number, string> = {
  0: "nose",
  11: "left shoulder",
  12: "right shoulder",
  23: "left hip",
  24: "right hip",
};

async function download(): Promise<string> {
  if (!dir.exists) dir.create();
  const dest = new File(dir, "sample.jpg");
  if (dest.exists) dest.delete();
  await File.downloadFileAsync(SAMPLE, dest);
  return dest.uri;
}

export default function PoseScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<any[]>([]);
  const [status, setStatus] = useState("Detect a sample");
  const [loading, setLoading] = useState(false);

  async function detect() {
    setLoading(true);
    setLandmarks([]);
    setStatus("Downloading…");
    try {
      const uri = await download();
      setImageUri(uri);
      setStatus("Detecting…");
      const t = Date.now();
      const found = await NitroPose.detect(uri);
      setLandmarks(found);
      setStatus(`${found.length} landmark(s) in ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  const highlights = landmarks.filter((l) => NAMES[l.type] !== undefined);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>@nitro-mlkit/pose-detection</Text>
      <Text style={s.subtitle}>On-device • 33 landmarks • Nitro batch</Text>
      <Pressable style={s.btn} onPress={detect} disabled={loading}>
        <Text style={s.btnText}>Detect sample</Text>
      </Pressable>
      {imageUri && <Image source={{ uri: imageUri }} style={s.preview} resizeMode="contain" />}
      <View style={s.statusRow}>
        {loading && <ActivityIndicator color="#7c3aed" />}
        <Text style={s.status}>{status}</Text>
      </View>
      {highlights.map((l, i) => (
        <View key={i} style={s.row}>
          <Text style={s.rowLabel}>{NAMES[l.type]}</Text>
          <Text style={s.rowValue}>
            ({l.x.toFixed(0)}, {l.y.toFixed(0)}) · {(l.inFrameLikelihood * 100).toFixed(0)}%
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
  btn: { backgroundColor: "#7c3aed", padding: 14, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  preview: { width: "100%", height: 260, borderRadius: 12, marginVertical: 16 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 16 },
  status: { color: "#ffd700", fontSize: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#222" },
  rowLabel: { color: "#fff", fontSize: 15 },
  rowValue: { color: "#a78bfa", fontSize: 13 },
});
