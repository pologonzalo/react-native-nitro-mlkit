import { NitroLanguageId } from "@nitro-mlkit/language-id";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const SAMPLES = [
  "The quick brown fox jumps over the lazy dog",
  "El veloz murciélago hindú comía feliz cardillo",
  "Portez ce vieux whisky au juge blond qui fume",
  "Wie schön dass du geboren bist, wir hätten dich sonst sehr vermisst",
];

export default function LangIdScreen() {
  const [rows, setRows] = useState<{ text: string; lang: string; extra: string }[]>([]);
  const [status, setStatus] = useState("Identify a sample");
  const [loading, setLoading] = useState(false);

  async function identify(text: string) {
    setLoading(true);
    setStatus("Identifying…");
    try {
      const t = Date.now();
      const lang = await NitroLanguageId.identify(text);
      const possible = await NitroLanguageId.identifyPossible(text);
      const extra = possible
        .slice(0, 3)
        .map((p) => `${p.language} ${(p.confidence * 100).toFixed(0)}%`)
        .join(", ");
      setRows((r) => [{ text, lang, extra }, ...r]);
      setStatus(`→ "${lang}" in ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>@nitro-mlkit/language-id</Text>
      <Text style={s.subtitle}>On-device • text → BCP-47 language</Text>

      {SAMPLES.map((t, i) => (
        <Pressable key={i} style={s.btn} onPress={() => identify(t)} disabled={loading}>
          <Text style={s.btnText} numberOfLines={1}>{t}</Text>
        </Pressable>
      ))}

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color="#0ea5e9" />}
        <Text style={s.status}>{status}</Text>
      </View>

      {rows.map((r, i) => (
        <View key={i} style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.lang}>{r.lang}</Text>
            <Text style={s.extra}>{r.extra}</Text>
          </View>
          <Text style={s.sample} numberOfLines={2}>{r.text}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A1A" },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: "bold", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#888", textAlign: "center", marginBottom: 20 },
  btn: { backgroundColor: "#0ea5e9", padding: 12, borderRadius: 10, alignItems: "center", marginVertical: 5 },
  btnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 16 },
  status: { color: "#ffd700", fontSize: 14 },
  card: { backgroundColor: "#1a1a2e", padding: 12, borderRadius: 8, marginBottom: 8 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  lang: { color: "#38bdf8", fontSize: 18, fontWeight: "700", textTransform: "uppercase" },
  extra: { color: "#888", fontSize: 12 },
  sample: { color: "#ddd", fontSize: 13 },
});
