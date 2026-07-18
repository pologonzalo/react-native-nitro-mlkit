import { NitroBarcode } from "@nitro-mlkit/barcode-scanning";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CODES } from "../src/samples";
import { C, F, R, T, keycap, tint, wash } from "../src/theme";
import { AnnotatedImage, Card, Pill, SamplePicker, TitleBlock, imageSize } from "../src/ui";

const ACCENT = "#d97706";

type Barcode = {
  rawValue: string;
  displayValue: string;
  format: string;
  valueType: string;
  bounds: { x: number; y: number; width: number; height: number };
};

export default function BarcodeScreen() {
  const [uri, setUri] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [codes, setCodes] = useState<Barcode[]>([]);
  const [status, setStatus] = useState("Pick or scan a code");
  const [loading, setLoading] = useState(false);

  async function run(u: string) {
    setUri(u);
    setCodes([]);
    setLoading(true);
    setStatus("Scanning…");
    try {
      setSize(await imageSize(u));
      const t = Date.now();
      const found = await NitroBarcode.scan(u);
      setCodes(found as Barcode[]);
      setStatus(`${found.length} code(s) · ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  async function batch() {
    if (!uri) return;
    setLoading(true);
    setStatus("Batch scan 20×…");
    try {
      const uris = Array(20).fill(uri);
      const t = Date.now();
      const results = await NitroBarcode.scanBatch(uris, 4);
      const total = results.reduce((n, r) => n + r.barcodes.length, 0);
      setStatus(`Batch: ${total} codes · ${Date.now() - t} ms · one bridge call`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TitleBlock name="@nitro-mlkit/barcode-scanning" tagline="QR + 1D/2D · boxes drawn · native batch" />
      <SamplePicker samples={CODES} accent={ACCENT} onPick={run} disabled={loading} />

      {uri && (
        <AnnotatedImage
          uri={uri}
          imageW={size.w}
          imageH={size.h}
          accent={ACCENT}
          boxes={codes.map((b) => ({ ...b.bounds, label: b.format }))}
        />
      )}

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color={ACCENT} />}
        <Text style={s.status}>{status}</Text>
      </View>

      {uri && (
        <Pressable style={s.batch} onPress={batch} disabled={loading}>
          <Text style={s.batchText}>Batch 20× 🚀</Text>
        </Pressable>
      )}

      {codes.map((b, i) => (
        <Card key={i} style={{ marginBottom: 10 }}>
          <View style={s.head}>
            <Pill accent={ACCENT}>{b.format}</Pill>
            <Text style={T.faint}>{b.valueType}</Text>
          </View>
          <Text style={s.raw} numberOfLines={4}>
            {b.rawValue}
          </Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 14 },
  status: { fontFamily: F.bodySemi, color: C.gold, fontSize: 14, textAlign: "center" },
  batch: {
    backgroundColor: wash(ACCENT, 0.16),
    borderColor: ACCENT,
    borderWidth: 2,
    paddingVertical: 12,
    borderRadius: R.md,
    alignItems: "center",
    marginBottom: 14,
    ...keycap(4),
  },
  batchText: { color: ACCENT, fontFamily: F.bodyBold, fontSize: 14 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  raw: { color: C.text, fontFamily: F.body, fontSize: 14 },
});
