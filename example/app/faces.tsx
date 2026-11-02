import { NitroFace, PerformanceMode } from "@nitro-mlkit/face-detection";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FACES } from "../src/samples";
import { C, F, R, T, wash } from "../src/theme";
import { Button, Card, Meter, Pill, SamplePicker, TitleBlock } from "../src/ui";

const ACCENT = C.blue;

type Face = {
  smilingProbability: number;
  leftEyeOpenProbability: number;
  rightEyeOpenProbability: number;
  bounds: { width: number; height: number };
};

export default function FacesScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [faces, setFaces] = useState<Face[]>([]);
  const [crops, setCrops] = useState<string[]>([]);
  const [status, setStatus] = useState("Pick a face to analyze");
  const [loading, setLoading] = useState(false);

  async function run(uri: string) {
    setImageUri(uri);
    setFaces([]);
    setCrops([]);
    setLoading(true);
    setStatus("Detecting…");
    try {
      const t = Date.now();
      const detected = await NitroFace.detect(uri, {
        performanceMode: PerformanceMode.ACCURATE,
        landmarks: true,
        classifications: true,
        minFaceSize: 0.1,
        tracking: false,
      });
      setFaces(detected as Face[]);
      setStatus(`${detected.length} face(s) in ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  async function crop() {
    if (!imageUri) return;
    setLoading(true);
    try {
      const cropped = await NitroFace.cropFaces(imageUri, 0.3);
      setCrops(cropped.map((c) => c.uri));
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  async function batch() {
    if (!imageUri) return;
    setLoading(true);
    setStatus("Batch 10×…");
    try {
      const uris = Array(10).fill(imageUri);
      const t = Date.now();
      const results = await NitroFace.detectBatch(uris, 4);
      const total = results.reduce((n, r) => n + r.faces.length, 0);
      setStatus(`Batch: ${total} faces in ${Date.now() - t} ms · one bridge call`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TitleBlock name="@nitro-mlkit/face-detection" tagline="Faces · smile & eyes · crop · batch" />
      <SamplePicker samples={FACES} accent={ACCENT} onPick={run} disabled={loading} />

      {imageUri && (
        <Image source={{ uri: imageUri }} style={s.preview} resizeMode="cover" />
      )}

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color={ACCENT} />}
        <Text style={s.status}>{status}</Text>
      </View>

      {imageUri && (
        <View style={s.actions}>
          <Button title="Crop faces" onPress={crop} disabled={loading} accent={ACCENT} variant="soft" small style={{ flex: 1 }} />
          <Button title="Batch 10× 🚀" onPress={batch} disabled={loading} accent={ACCENT} variant="soft" small style={{ flex: 1 }} />
        </View>
      )}

      {crops.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {crops.map((uri, i) => (
            <Image key={i} source={{ uri }} style={s.crop} />
          ))}
        </ScrollView>
      )}

      {faces.map((f, i) => (
        <Card key={i} style={{ marginBottom: 10 }}>
          <View style={s.cardHead}>
            <Text style={T.label}>Face {i + 1}</Text>
            <Pill accent={ACCENT}>
              {f.bounds.width.toFixed(0)}×{f.bounds.height.toFixed(0)}
            </Pill>
          </View>
          <MeterRow label="😊 Smiling" value={f.smilingProbability} accent={ACCENT} />
          <MeterRow label="👁️ Left eye" value={f.leftEyeOpenProbability} accent={ACCENT} />
          <MeterRow label="👁️ Right eye" value={f.rightEyeOpenProbability} accent={ACCENT} />
        </Card>
      ))}

      {/* Batch detection has its own showpiece: the benchmark race. */}
      <Card style={s.race}>
        <View style={s.raceHead}>
          <View style={{ ...s.raceChip, backgroundColor: wash(ACCENT, 0.14) }}>
            <Text style={{ fontSize: 22 }}>🏁</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={T.h2}>The Race</Text>
            <Text style={T.sub}>
              Nitro's native batch vs two bridge wrappers — same ML Kit engine, real measured times.
            </Text>
          </View>
        </View>
        <Button title="Watch it run" onPress={() => router.push("/benchmark")} accent={ACCENT} small style={{ marginTop: 12 }} />
      </Card>
    </ScrollView>
  );
}

function MeterRow({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <View style={{ marginTop: 10 }}>
      <View style={s.meterHead}>
        <Text style={T.sub}>{label}</Text>
        <Text style={T.mono}>{(value * 100).toFixed(0)}%</Text>
      </View>
      <Meter value={value} accent={accent} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  preview: { width: "100%", height: 280, borderRadius: R.lg, marginTop: 16, backgroundColor: C.surfaceAlt, borderWidth: 2, borderColor: C.border },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 14 },
  status: { fontFamily: F.bodySemi, color: C.gold, fontSize: 14, textAlign: "center" },
  actions: { flexDirection: "row", gap: 10, marginBottom: 14 },
  crop: { width: 96, height: 96, borderRadius: R.md, marginRight: 10, backgroundColor: C.surfaceAlt, borderWidth: 2, borderColor: C.border },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  meterHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },

  race: { marginTop: 8 },
  raceHead: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  raceChip: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
