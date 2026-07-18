import { NitroFaceMesh, isFaceMeshSupported } from "@nitro-mlkit/face-mesh";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { FACES } from "../src/samples";
import { C, F, T } from "../src/theme";
import { AnnotatedImage, Card, Pill, SamplePicker, TitleBlock, imageSize } from "../src/ui";

const ACCENT = "#f43f5e";

export default function FaceMeshScreen() {
  // ML Kit Face Mesh Detection is Android-only (no iOS SDK). Platform.OS is
  // constant, so this early return keeps hook order consistent per platform.
  if (!isFaceMeshSupported) {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <TitleBlock name="@nitro-mlkit/face-mesh" tagline="Android-only · ML Kit has no iOS SDK" />
        <Card>
          <View style={s.head}>
            <Text style={T.label}>Not available on iOS</Text>
            <Pill accent={ACCENT}>Android-only</Pill>
          </View>
          <Text style={T.sub}>
            Google ML Kit ships no iOS SDK for Face Mesh Detection. Run this demo on an Android device.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  const [uri, setUri] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [points, setPoints] = useState<any[]>([]);
  const [status, setStatus] = useState("Pick a face");
  const [loading, setLoading] = useState(false);

  async function run(u: string) {
    setUri(u);
    setPoints([]);
    setLoading(true);
    setStatus("Detecting…");
    try {
      setSize(await imageSize(u));
      const t = Date.now();
      const found = await NitroFaceMesh.detect(u);
      setPoints(found);
      setStatus(`${found.length} mesh points · ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  // Downsample for a clean overlay (drawing all 468 tiny views is heavy).
  const dots = points.filter((_, i) => i % 3 === 0);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TitleBlock name="@nitro-mlkit/face-mesh" tagline="Up to 468 3D points · mesh overlay" />
      <SamplePicker samples={FACES} accent={ACCENT} onPick={run} disabled={loading} />

      {uri && (
        <AnnotatedImage uri={uri} imageW={size.w} imageH={size.h} accent={ACCENT} points={dots} dotSize={3} />
      )}

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color={ACCENT} />}
        <Text style={s.status}>{status}</Text>
      </View>

      {points.length > 0 && (
        <Card>
          <View style={s.head}>
            <Text style={T.label}>Mesh</Text>
            <Pill accent={ACCENT}>{points.length} points</Pill>
          </View>
          <Text style={T.sub}>
            Sample point 0: ({points[0].x.toFixed(1)}, {points[0].y.toFixed(1)}, {points[0].z.toFixed(1)})
          </Text>
          <Text style={T.faint}>Overlay shows every 3rd point for clarity.</Text>
        </Card>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 14 },
  status: { fontFamily: F.bodySemi, color: C.gold, fontSize: 14, textAlign: "center" },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
});
