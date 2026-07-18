import { NitroSubjectSegmenter } from "@nitro-mlkit/subject-segmentation";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SCENES } from "../src/samples";
import { C, F, R, T } from "../src/theme";
import { Card, Pill, SamplePicker, TitleBlock } from "../src/ui";

const ACCENT = "#10b981";
const SUPPORTED = Platform.OS === "android";

export default function SubjectSegScreen() {
  const [uri, setUri] = useState<string | null>(null);
  const [fgUri, setFgUri] = useState<string | null>(null);
  const [subjects, setSubjects] = useState(0);
  const [status, setStatus] = useState("Pick an image");
  const [loading, setLoading] = useState(false);

  async function run(u: string) {
    setUri(u);
    setFgUri(null);
    setLoading(true);
    setStatus("Segmenting (downloads model on first use)…");
    try {
      const t = Date.now();
      const r = await NitroSubjectSegmenter.segment(u);
      setFgUri(r.foregroundUri);
      setSubjects(r.subjectCount);
      setStatus(`${r.subjectCount} subject(s) · ${r.width}×${r.height} · ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TitleBlock name="@nitro-mlkit/subject-segmentation" tagline="Cut out the main subject · Android-only" />

      {!SUPPORTED && (
        <Card style={{ marginBottom: 14 }}>
          <Text style={T.sub}>
            Google ML Kit ships Subject Segmentation on Android only, so this
            screen is inert on iOS.
          </Text>
        </Card>
      )}

      <SamplePicker samples={SCENES} accent={ACCENT} onPick={run} disabled={loading || !SUPPORTED} />

      {uri && (
        <View style={s.compare}>
          <View style={s.col}>
            <Text style={s.colLabel}>INPUT</Text>
            <Image source={{ uri }} style={s.img} resizeMode="cover" />
          </View>
          <View style={s.col}>
            <Text style={s.colLabel}>SUBJECT</Text>
            {fgUri ? (
              <Image source={{ uri: fgUri }} style={{ ...s.img, backgroundColor: "#052e26" }} resizeMode="contain" />
            ) : (
              <View style={{ ...s.img, ...s.placeholder }}>{loading && <ActivityIndicator color={ACCENT} />}</View>
            )}
          </View>
        </View>
      )}

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color={ACCENT} />}
        <Text style={s.status}>{status}</Text>
      </View>

      {fgUri && (
        <Card>
          <View style={s.head}>
            <Text style={T.label}>Subjects</Text>
            <Pill accent={ACCENT}>{subjects}</Pill>
          </View>
          <Text style={T.faint}>Transparent PNG cutout of the foreground subject(s).</Text>
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
