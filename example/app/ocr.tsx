import { NitroText } from "@nitro-mlkit/text-recognition";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { TEXTS } from "../src/samples";
import { C, F, R, T, keycap, tint, wash } from "../src/theme";
import { Card, Pill, SamplePicker, TitleBlock } from "../src/ui";

const ACCENT = "#ec4899";

export default function OcrScreen() {
  const [uri, setUri] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [meta, setMeta] = useState("");
  const [status, setStatus] = useState("Pick an image");
  const [loading, setLoading] = useState(false);

  async function run(u: string) {
    setUri(u);
    setText("");
    setMeta("");
    setLoading(true);
    setStatus("Recognizing…");
    try {
      const t = Date.now();
      const result = await NitroText.recognize(u);
      const lines = result.blocks.reduce((n, b) => n + b.lines.length, 0);
      setText(result.text);
      setMeta(`${result.blocks.length} blocks · ${lines} lines · ${Date.now() - t} ms`);
      setStatus("Done ✅");
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  async function batch() {
    if (!uri) return;
    setLoading(true);
    setStatus("Batch 20×…");
    try {
      const uris = Array(20).fill(uri);
      const t = Date.now();
      const results = await NitroText.recognizeBatch(uris, 4);
      const ok = results.filter((r) => r.success).length;
      setStatus(`Batch: ${ok}/20 · ${Date.now() - t} ms · one bridge call`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TitleBlock name="@nitro-mlkit/text-recognition" tagline="On-device OCR · blocks & lines · native batch" />
      <SamplePicker samples={TEXTS} accent={ACCENT} onPick={run} disabled={loading} />

      {uri && <Image source={{ uri }} style={s.preview} resizeMode="contain" />}

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color={ACCENT} />}
        <Text style={s.status}>{status}</Text>
      </View>

      {uri && (
        <Pressable style={s.batch} onPress={batch} disabled={loading}>
          <Text style={s.batchText}>Batch 20× 🚀</Text>
        </Pressable>
      )}

      {!!text && (
        <Card>
          <View style={s.head}>
            <Text style={T.label}>Recognized</Text>
            <Pill accent={ACCENT}>OCR</Pill>
          </View>
          <Text style={s.recognized}>{text}</Text>
          <Text style={{ ...T.faint, marginTop: 10 }}>{meta}</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  preview: { width: "100%", height: 150, borderRadius: R.lg, marginTop: 16, backgroundColor: "#fff", borderWidth: 2, borderColor: C.ink },
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
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  recognized: { color: C.text, fontFamily: F.bodyBold, fontSize: 18, lineHeight: 26 },
});
