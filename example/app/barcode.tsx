import { NitroBarcode } from "@nitro-mlkit/barcode-scanning";
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

type Barcode = {
  rawValue: string;
  displayValue: string;
  format: string;
  valueType: string;
};

// Deterministic sample images (downloaded once into the sandbox, then scanned).
const SAMPLES = {
  qr: "https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=https%3A%2F%2Fgithub.com%2Fnitro-mlkit",
  ean: "https://barcodeapi.org/api/ean13/5901234123457",
};

const dir = new Directory(Paths.document, "barcodes");

async function download(name: string, url: string): Promise<string> {
  if (!dir.exists) dir.create();
  const dest = new File(dir, name);
  if (dest.exists) dest.delete();
  await File.downloadFileAsync(url, dest);
  return dest.uri;
}

export default function BarcodeScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [barcodes, setBarcodes] = useState<Barcode[]>([]);
  const [status, setStatus] = useState("Scan a sample code");
  const [loading, setLoading] = useState(false);

  async function scanSample(kind: "qr" | "ean") {
    setLoading(true);
    setBarcodes([]);
    setStatus(`Downloading ${kind.toUpperCase()}…`);
    try {
      const uri = await download(`${kind}.png`, SAMPLES[kind]);
      setImageUri(uri);
      setStatus("Scanning…");
      const t = Date.now();
      const found = await NitroBarcode.scan(uri);
      setBarcodes(found);
      setStatus(`${found.length} code(s) in ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  async function batch() {
    setLoading(true);
    setStatus("Batch scan 20×…");
    try {
      const uri = await download("qr.png", SAMPLES.qr);
      setImageUri(uri);
      const uris = Array(20).fill(uri);
      const t = Date.now();
      const results = await NitroBarcode.scanBatch(uris, 4);
      const total = results.reduce((n, r) => n + r.barcodes.length, 0);
      Alert.alert(
        "Batch complete",
        `20 images, ${total} codes — ONE bridge call, ${Date.now() - t} ms`,
      );
      setStatus(`Batch: ${total} codes in ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>@nitro-mlkit/barcode-scanning</Text>
      <Text style={s.subtitle}>On-device • QR + 1D/2D • Nitro batch</Text>

      <View style={s.actions}>
        <Pressable style={s.btnQr} onPress={() => scanSample("qr")} disabled={loading}>
          <Text style={s.btnText}>Scan sample QR</Text>
        </Pressable>
        <Pressable style={s.btnEan} onPress={() => scanSample("ean")} disabled={loading}>
          <Text style={s.btnText}>Scan sample EAN-13</Text>
        </Pressable>
        <Pressable style={s.btnAccent} onPress={batch} disabled={loading}>
          <Text style={s.btnText}>Batch (20×) 🚀</Text>
        </Pressable>
      </View>

      {imageUri && (
        <Image source={{ uri: imageUri }} style={s.preview} resizeMode="contain" />
      )}

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color="#d97706" />}
        <Text style={s.status}>{status}</Text>
      </View>

      {barcodes.map((b, i) => (
        <View key={i} style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.format}>{b.format}</Text>
            <Text style={s.valueType}>{b.valueType}</Text>
          </View>
          <Text style={s.raw} numberOfLines={3}>
            {b.rawValue}
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
  actions: { gap: 8 },
  btnQr: { backgroundColor: "#d97706", padding: 14, borderRadius: 10, alignItems: "center" },
  btnEan: { backgroundColor: "#b45309", padding: 14, borderRadius: 10, alignItems: "center" },
  btnAccent: { backgroundColor: "#22c55e", padding: 14, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  preview: { width: "100%", height: 240, borderRadius: 12, marginVertical: 16, backgroundColor: "#fff" },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 16 },
  status: { color: "#ffd700", fontSize: 14 },
  card: { backgroundColor: "#1a1a2e", padding: 12, borderRadius: 8, marginBottom: 8 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  format: { color: "#fbbf24", fontSize: 14, fontWeight: "700" },
  valueType: { color: "#60a5fa", fontSize: 13, fontWeight: "600" },
  raw: { color: "#ddd", fontSize: 13 },
});
