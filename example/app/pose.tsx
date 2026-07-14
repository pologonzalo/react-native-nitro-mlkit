import { NitroPose } from "@nitro-mlkit/pose-detection";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { FACES } from "../src/samples";
import { C, R, T } from "../src/theme";
import { AnnotatedImage, Card, Pill, SamplePicker, TitleBlock, imageSize } from "../src/ui";

const ACCENT = "#8b5cf6";
const NAMES: Record<number, string> = {
  0: "nose",
  11: "left shoulder",
  12: "right shoulder",
  13: "left elbow",
  14: "right elbow",
  23: "left hip",
  24: "right hip",
  25: "left knee",
  26: "right knee",
};

export default function PoseScreen() {
  const [uri, setUri] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [landmarks, setLandmarks] = useState<any[]>([]);
  const [status, setStatus] = useState("Pick an image");
  const [loading, setLoading] = useState(false);

  async function run(u: string) {
    setUri(u);
    setLandmarks([]);
    setLoading(true);
    setStatus("Detecting…");
    try {
      setSize(await imageSize(u));
      const t = Date.now();
      const found = await NitroPose.detect(u);
      setLandmarks(found);
      setStatus(`${found.length} landmarks · ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  const visible = landmarks.filter((l) => l.inFrameLikelihood > 0.3);
  const highlights = landmarks.filter((l) => NAMES[l.type] !== undefined);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TitleBlock name="@nitro-mlkit/pose-detection" tagline="33 body landmarks · overlaid on the image" />
      <SamplePicker samples={FACES} accent={ACCENT} onPick={run} disabled={loading} />

      {uri && (
        <AnnotatedImage
          uri={uri}
          imageW={size.w}
          imageH={size.h}
          accent={ACCENT}
          points={visible}
          dotSize={9}
        />
      )}

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color={ACCENT} />}
        <Text style={s.status}>{status}</Text>
      </View>

      {highlights.length > 0 && (
        <Card>
          {highlights.map((l, i) => (
            <View key={i} style={s.row}>
              <Text style={T.label}>{NAMES[l.type]}</Text>
              <View style={s.rowRight}>
                <Text style={T.mono}>({l.x.toFixed(0)}, {l.y.toFixed(0)})</Text>
                <Pill accent={l.inFrameLikelihood > 0.5 ? ACCENT : C.faint}>
                  {(l.inFrameLikelihood * 100).toFixed(0)}%
                </Pill>
              </View>
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
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 14 },
  status: { color: C.gold, fontSize: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderSoft },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 10 },
});
