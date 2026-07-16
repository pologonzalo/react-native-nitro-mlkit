import { NitroSelfieSegmenter } from "@nitro-mlkit/selfie-segmentation";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { FACES } from "../src/samples";
import { C, F, R, T } from "../src/theme";
import { Card, Meter, Pill, SamplePicker, TitleBlock } from "../src/ui";

const ACCENT = "#14b8a6";

export default function SelfieSegScreen() {
  const [uri, setUri] = useState<string | null>(null);
  const [maskUri, setMaskUri] = useState<string | null>(null);
  const [fg, setFg] = useState(0);
  const [status, setStatus] = useState("Pick an image");
  const [loading, setLoading] = useState(false);

  async function run(u: string) {
    setUri(u);
    setMaskUri(null);
    setLoading(true);
    setStatus("Segmenting…");
    try {
      const t = Date.now();
      const r = await NitroSelfieSegmenter.segment(u);
      setMaskUri(r.maskUri);
      setFg(r.foregroundRatio);
      setStatus(`${r.width}×${r.height} · ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TitleBlock name="@nitro-mlkit/selfie-segmentation" tagline="Person vs background · compare input & mask" />
      <SamplePicker samples={FACES} accent={ACCENT} onPick={run} disabled={loading} />

      {uri && (
        <View style={s.compare}>
          <View style={s.col}>
            <Text style={s.colLabel}>INPUT</Text>
            <Image source={{ uri }} style={s.img} resizeMode="cover" />
          </View>
          <View style={s.col}>
            <Text style={s.colLabel}>MASK</Text>
            {maskUri ? (
              <Image source={{ uri: maskUri }} style={{ ...s.img, backgroundColor: "#0b3b36" }} resizeMode="cover" />
            ) : (
              <View style={{ ...s.img, ...s.placeholder }}>
                {loading && <ActivityIndicator color={ACCENT} />}
              </View>
            )}
          </View>
        </View>
      )}

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color={ACCENT} />}
        <Text style={s.status}>{status}</Text>
      </View>

      {maskUri && (
        <Card>
          <View style={s.head}>
            <Text style={T.label}>Foreground</Text>
            <Pill accent={ACCENT}>{(fg * 100).toFixed(0)}%</Pill>
          </View>
          <Meter value={fg} accent={ACCENT} />
          <Text style={{ ...T.faint, marginTop: 8 }}>
            Mask alpha = per-pixel confidence the pixel is the person.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  compare: { flexDirection: "row", gap: 10, marginTop: 16 },
  col: { flex: 1 },
  colLabel: { color: C.faint, fontFamily: F.bodyBold, fontSize: 11, marginBottom: 6, letterSpacing: 1 },
  img: { width: "100%", height: 220, borderRadius: R.lg, backgroundColor: C.surfaceAlt, borderWidth: 2, borderColor: C.ink },
  placeholder: { alignItems: "center", justifyContent: "center" },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 14 },
  status: { fontFamily: F.bodySemi, color: C.gold, fontSize: 13, textAlign: "center" },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
});
