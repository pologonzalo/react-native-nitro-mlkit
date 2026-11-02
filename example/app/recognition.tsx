import { NitroRecognizer } from "@nitro-mlkit/face-recognition";
import { type ReactNode, useState } from "react";
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
import { PERSONS } from "../src/samples";
import { C, F, R, T, wash } from "../src/theme";
import { Button, Card, Meter, Pill, TitleBlock } from "../src/ui";

const ACCENT = C.blueDeep;
// A TFLite face-embedding model (downloaded at runtime; you host your own in prod).
const MODEL_URL =
  "https://huggingface.co/unixio/nova-face-embedding/resolve/main/tflite/face_embedding_v1.tflite";

// Two people to register, plus a stranger who should match nobody.
const [PERSON_A, PERSON_B, STRANGER] = PERSONS;

export default function RecognitionScreen() {
  const supported = NitroRecognizer.isSupported();
  const [modelReady, setModelReady] = useState(supported ? NitroRecognizer.isModelReady() : false);
  const [registered, setRegistered] = useState<string[]>([]);
  const [results, setResults] = useState<{ id: string; name: string; sim: number }[]>([]);
  const [status, setStatus] = useState("Step 1: load the embedding model");
  const [loading, setLoading] = useState(false);

  async function loadModel() {
    setLoading(true);
    setStatus("Downloading model (~5 MB)…");
    try {
      const t = Date.now();
      await NitroRecognizer.downloadModel(MODEL_URL);
      setModelReady(true);
      setStatus(`Model ready · ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("downloadModel", e.message);
    }
    setLoading(false);
  }

  async function registerPeople() {
    setLoading(true);
    setStatus("Registering 2 people…");
    try {
      await NitroRecognizer.registerPerson("a", PERSON_A.label, PERSON_A.url);
      await NitroRecognizer.registerPerson("b", PERSON_B.label, PERSON_B.url);
      setRegistered(NitroRecognizer.getRegistry().map((p) => p.name));
      setStatus("Registered 2 people");
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("registerPerson", e.message);
    }
    setLoading(false);
  }

  async function identify(sample: { label: string; url: string }) {
    setLoading(true);
    setResults([]);
    setStatus(`Identifying ${sample.label}…`);
    try {
      const t = Date.now();
      const found = await NitroRecognizer.findPeople(sample.url);
      setResults(
        found
          .map((r) => ({ id: r.person.id, name: r.person.name, sim: r.similarity }))
          .sort((x, y) => y.sim - x.sim),
      );
      setStatus(`${found.length} match(es) · ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("findPeople", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TitleBlock name="@nitro-mlkit/face-recognition" tagline="Register faces → find people · TFLite embeddings" />

      {!supported && (
        <Card style={{ marginBottom: 14 }}>
          <Text style={T.sub}>
            Face recognition is Android-only for now — the iOS TensorFlow Lite
            embedding path isn't implemented yet (planned for v0.2). This screen
            is inert on iOS.
          </Text>
        </Card>
      )}

      <Step n={1} label="Load model" done={modelReady}>
        <Button
          title={modelReady ? "✓ Model ready" : "Download model"}
          onPress={loadModel}
          accent={ACCENT}
          disabled={loading || modelReady || !supported}
        />
      </Step>

      <Step n={2} label="Register people" done={registered.length > 0}>
        <View style={s.people}>
          {[PERSON_A, PERSON_B].map((p) => (
            <Image key={p.url} source={{ uri: p.url }} style={s.avatar} />
          ))}
        </View>
        <Button
          title="Register 2 people"
          onPress={registerPeople}
          accent={ACCENT}
          disabled={loading || !modelReady}
        />
        {registered.length > 0 && (
          <Text style={{ ...T.faint, marginTop: 8 }}>Registry: {registered.join(", ")}</Text>
        )}
      </Step>

      <Step n={3} label="Who is this?" done={false}>
        <View style={s.queryRow}>
          {[PERSON_A, PERSON_B, STRANGER].map((p) => (
            <Pressable key={p.url} onPress={() => identify(p)} disabled={loading || registered.length === 0}>
              <Image source={{ uri: p.url }} style={s.queryImg} />
              <Text style={s.queryLabel}>{p.label}</Text>
            </Pressable>
          ))}
        </View>
      </Step>

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color={ACCENT} />}
        <Text style={s.status}>{status}</Text>
      </View>

      {results.length > 0 && (
        <Card>
          <Text style={{ ...T.label, marginBottom: 10 }}>Matches</Text>
          {results.map((r, i) => (
            <View key={i} style={{ marginBottom: 10 }}>
              <View style={s.matchHead}>
                <Text style={T.label}>{i === 0 ? "★ " : ""}{r.name}</Text>
                <Pill accent={ACCENT}>{(r.sim * 100).toFixed(1)}%</Pill>
              </View>
              <Meter value={r.sim} accent={ACCENT} />
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

function Step({ n, label, done, children }: { n: number; label: string; done: boolean; children: ReactNode }) {
  return (
    <View style={s.step}>
      <View style={s.stepHead}>
        <View style={{ ...s.stepNum, backgroundColor: done ? ACCENT : wash(ACCENT, 0.15) }}>
          <Text style={{ ...s.stepNumText, color: done ? "#fff" : ACCENT }}>{done ? "✓" : n}</Text>
        </View>
        <Text style={T.label}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  step: { marginBottom: 18 },
  stepHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontFamily: F.bodyBold, fontSize: 12 },
  people: { flexDirection: "row", gap: 10, marginBottom: 10 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.surfaceAlt, borderWidth: 2, borderColor: C.border },
  queryRow: { flexDirection: "row", gap: 12 },
  queryImg: { width: 90, height: 90, borderRadius: R.md, backgroundColor: C.surfaceAlt, borderWidth: 2, borderColor: C.border },
  queryLabel: { color: C.dim, fontFamily: F.bodySemi, fontSize: 11, textAlign: "center", marginTop: 4 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 14 },
  status: { fontFamily: F.bodySemi, color: C.gold, fontSize: 14, textAlign: "center" },
  matchHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
});
