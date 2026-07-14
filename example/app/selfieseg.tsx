import { NitroSelfieSegmenter } from "@nitro-mlkit/selfie-segmentation";
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
const dir = new Directory(Paths.document, "selfieseg");

async function download(): Promise<string> {
  if (!dir.exists) dir.create();
  const dest = new File(dir, "sample.jpg");
  if (dest.exists) dest.delete();
  await File.downloadFileAsync(SAMPLE, dest);
  return dest.uri;
}

export default function SelfieSegScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [maskUri, setMaskUri] = useState<string | null>(null);
  const [status, setStatus] = useState("Segment a sample");
  const [loading, setLoading] = useState(false);

  async function segment() {
    setLoading(true);
    setMaskUri(null);
    setStatus("Downloading…");
    try {
      const uri = await download();
      setImageUri(uri);
      setStatus("Segmenting…");
      const t = Date.now();
      const r = await NitroSelfieSegmenter.segment(uri);
      setMaskUri(r.maskUri);
      setStatus(
        `${r.width}×${r.height} · ${(r.foregroundRatio * 100).toFixed(0)}% foreground · ${Date.now() - t} ms`,
      );
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>@nitro-mlkit/selfie-segmentation</Text>
      <Text style={s.subtitle}>On-device • foreground mask • Nitro batch</Text>
      <Pressable style={s.btn} onPress={segment} disabled={loading}>
        <Text style={s.btnText}>Segment sample</Text>
      </Pressable>
      <View style={s.imgRow}>
        {imageUri && <Image source={{ uri: imageUri }} style={s.img} resizeMode="contain" />}
        {maskUri && <Image source={{ uri: maskUri }} style={[s.img, s.mask]} resizeMode="contain" />}
      </View>
      <View style={s.statusRow}>
        {loading && <ActivityIndicator color="#0d9488" />}
        <Text style={s.status}>{status}</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A1A" },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 19, fontWeight: "bold", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#888", textAlign: "center", marginBottom: 20 },
  btn: { backgroundColor: "#0d9488", padding: 14, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  imgRow: { flexDirection: "row", gap: 8, marginVertical: 16 },
  img: { flex: 1, height: 220, borderRadius: 12 },
  mask: { backgroundColor: "#334155" },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  status: { color: "#ffd700", fontSize: 13, textAlign: "center" },
});
