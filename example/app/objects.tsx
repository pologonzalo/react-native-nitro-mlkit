import { NitroObjects } from "@nitro-mlkit/object-detection";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SCENES } from "../src/samples";
import { C, R, T } from "../src/theme";
import { AnnotatedImage, Card, Pill, SamplePicker, TitleBlock, imageSize } from "../src/ui";

const ACCENT = "#22c55e";

export default function ObjectsScreen() {
  const [uri, setUri] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [objects, setObjects] = useState<any[]>([]);
  const [status, setStatus] = useState("Pick an image");
  const [loading, setLoading] = useState(false);

  async function run(u: string) {
    setUri(u);
    setObjects([]);
    setLoading(true);
    setStatus("Detecting…");
    try {
      setSize(await imageSize(u));
      const t = Date.now();
      const found = await NitroObjects.detect(u);
      setObjects(found);
      setStatus(`${found.length} object(s) · ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  const boxes = objects.map((o) => ({
    x: o.bounds.x,
    y: o.bounds.y,
    width: o.bounds.width,
    height: o.bounds.height,
    label: o.labels[0]?.text,
  }));

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TitleBlock name="@nitro-mlkit/object-detection" tagline="Bounding boxes + labels, drawn on the photo" />
      <SamplePicker samples={SCENES} accent={ACCENT} onPick={run} disabled={loading} />

      {uri && (
        <AnnotatedImage uri={uri} imageW={size.w} imageH={size.h} accent={ACCENT} boxes={boxes} />
      )}

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color={ACCENT} />}
        <Text style={s.status}>{status}</Text>
      </View>

      {objects.map((o, i) => (
        <Card key={i} style={{ marginBottom: 10 }}>
          <View style={s.head}>
            <Text style={T.label}>
              Object {i + 1}
              {o.trackingId >= 0 ? ` · id ${o.trackingId}` : ""}
            </Text>
            <Pill accent={ACCENT}>
              {o.bounds.width.toFixed(0)}×{o.bounds.height.toFixed(0)}
            </Pill>
          </View>
          <Text style={T.sub}>
            {o.labels.length
              ? o.labels
                  .map((l: any) => `${l.text} ${(l.confidence * 100).toFixed(0)}%`)
                  .join(" · ")
              : "no label (prominent-object mode)"}
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
  status: { color: C.gold, fontSize: 14 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
});
