import { NitroLabeler } from "@nitro-mlkit/image-labeling";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SCENES } from "../src/samples";
import { C, R, T, tint } from "../src/theme";
import { Card, Meter, SamplePicker, TitleBlock } from "../src/ui";

const ACCENT = "#06b6d4";
type Label = { text: string; confidence: number; index: number };

export default function LabelingScreen() {
  const [uri, setUri] = useState<string | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [status, setStatus] = useState("Pick an image");
  const [loading, setLoading] = useState(false);

  async function run(u: string) {
    setUri(u);
    setLabels([]);
    setLoading(true);
    setStatus("Labeling…");
    try {
      const t = Date.now();
      const result = await NitroLabeler.label(u, { confidenceThreshold: 0.5, maxLabels: 10 });
      setLabels(result);
      setStatus(`${result.length} labels · ${Date.now() - t} ms`);
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
      const results = await NitroLabeler.labelBatch(uris, { concurrency: 4 });
      const total = results.reduce((n, r) => n + r.labels.length, 0);
      setStatus(`Batch: ${total} labels · ${Date.now() - t} ms · one bridge call`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TitleBlock name="@nitro-mlkit/image-labeling" tagline="400+ labels with confidence · native batch" />
      <SamplePicker samples={SCENES} accent={ACCENT} onPick={run} disabled={loading} />

      {uri && <Image source={{ uri }} style={s.preview} resizeMode="cover" />}

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color={ACCENT} />}
        <Text style={s.status}>{status}</Text>
      </View>

      {uri && (
        <Pressable style={s.batch} onPress={batch} disabled={loading}>
          <Text style={s.batchText}>Batch 20× 🚀</Text>
        </Pressable>
      )}

      {labels.length > 0 && (
        <Card>
          {labels.map((l, i) => (
            <View key={i} style={{ marginBottom: i === labels.length - 1 ? 0 : 12 }}>
              <View style={s.labelHead}>
                <Text style={{ ...T.label, textTransform: "capitalize" }}>{l.text}</Text>
                <Text style={T.mono}>{(l.confidence * 100).toFixed(1)}%</Text>
              </View>
              <Meter value={l.confidence} accent={ACCENT} />
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  preview: { width: "100%", height: 240, borderRadius: R.lg, marginTop: 16, backgroundColor: C.surfaceAlt },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 14 },
  status: { color: C.gold, fontSize: 14 },
  batch: {
    backgroundColor: tint(ACCENT, 0.16),
    borderColor: tint(ACCENT, 0.5),
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: R.md,
    alignItems: "center",
    marginBottom: 14,
  },
  batchText: { color: ACCENT, fontWeight: "700", fontSize: 14 },
  labelHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
});
