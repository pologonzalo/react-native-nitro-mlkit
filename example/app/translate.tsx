import { NitroTranslate } from "@nitro-mlkit/translation";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { C, R, T, tint } from "../src/theme";
import { Card, Pill, TitleBlock } from "../src/ui";

const ACCENT = "#6366f1";
const TARGETS = [
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
];
const PRESETS = [
  "Hello, how are you today?",
  "Where is the train station?",
  "This library runs on-device with zero bridge overhead",
];

type Row = { src: string; out: string; target: string; ms: number };

export default function TranslateScreen() {
  const [target, setTarget] = useState("es");
  const [input, setInput] = useState("Hello, how are you today?");
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("Translate from English");
  const [loading, setLoading] = useState(false);

  async function translate(text: string) {
    if (!text.trim()) return;
    setLoading(true);
    setStatus("Translating (downloads model on first use)…");
    try {
      const t = Date.now();
      const out = await NitroTranslate.translate(text, "en", target);
      setRows((r) => [{ src: text, out, target, ms: Date.now() - t }, ...r]);
      setStatus(`→ ${target} · ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TitleBlock name="@nitro-mlkit/translation" tagline="On-device translation · 50+ languages" />

      <Text style={s.label}>TARGET</Text>
      <View style={s.targets}>
        {TARGETS.map((tg) => {
          const on = tg.code === target;
          return (
            <Pressable
              key={tg.code}
              onPress={() => setTarget(tg.code)}
              style={{
                ...s.target,
                backgroundColor: on ? ACCENT : tint(ACCENT, 0.14),
                borderColor: on ? ACCENT : tint(ACCENT, 0.4),
              }}
            >
              <Text style={{ ...s.targetText, color: on ? "#fff" : ACCENT }}>{tg.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        style={s.input}
        value={input}
        onChangeText={setInput}
        placeholder="Type English text…"
        placeholderTextColor={C.faint}
        multiline
      />
      <Pressable style={s.go} onPress={() => translate(input)} disabled={loading}>
        <Text style={s.goText}>Translate →</Text>
      </Pressable>

      <Text style={{ ...T.faint, marginTop: 14, marginBottom: 6 }}>OR TAP A PHRASE</Text>
      {PRESETS.map((p, i) => (
        <Pressable key={i} style={s.chip} onPress={() => translate(p)} disabled={loading}>
          <Text style={s.chipText} numberOfLines={1}>{p}</Text>
        </Pressable>
      ))}

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color={ACCENT} />}
        <Text style={s.status}>{status}</Text>
      </View>

      {rows.map((r, i) => (
        <Card key={i} style={{ marginBottom: 10 }}>
          <View style={s.head}>
            <Pill accent={ACCENT}>en → {r.target}</Pill>
            <Text style={T.faint}>{r.ms} ms</Text>
          </View>
          <Text style={{ ...T.sub, marginBottom: 6 }}>{r.src}</Text>
          <Text style={s.out}>{r.out}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  label: { color: C.faint, fontSize: 12, fontWeight: "700", marginBottom: 8, letterSpacing: 1 },
  targets: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  target: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: R.pill, borderWidth: 1 },
  targetText: { fontSize: 13, fontWeight: "700" },
  input: {
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: R.md,
    color: C.text,
    fontSize: 15,
    padding: 14,
    minHeight: 70,
    textAlignVertical: "top",
  },
  go: { backgroundColor: ACCENT, paddingVertical: 13, borderRadius: R.md, alignItems: "center", marginTop: 10 },
  goText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  chip: {
    backgroundColor: tint(ACCENT, 0.12),
    borderColor: tint(ACCENT, 0.35),
    borderWidth: 1,
    borderRadius: R.md,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  chipText: { color: C.text, fontSize: 13, fontWeight: "600" },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 16 },
  status: { color: C.gold, fontSize: 14, textAlign: "center" },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  out: { color: ACCENT, fontSize: 19, fontWeight: "700" },
});
