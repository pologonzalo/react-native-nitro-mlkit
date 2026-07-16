import { NitroLanguageId } from "@nitro-mlkit/language-id";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { C, F, R, T, keycap, tint, wash } from "../src/theme";
import { Card, Meter, Pill, TitleBlock } from "../src/ui";

const ACCENT = "#0ea5e9";
const SAMPLES = [
  "The quick brown fox jumps over the lazy dog",
  "El veloz murciélago hindú comía feliz cardillo",
  "Portez ce vieux whisky au juge blond qui fume",
  "Wie schön dass du geboren bist",
  "いろはにほへと ちりぬるを",
  "El futuro pertenece a quienes creen en sus sueños",
];

type Row = { text: string; lang: string; possible: { language: string; confidence: number }[] };

export default function LangIdScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("Tap a phrase");
  const [loading, setLoading] = useState(false);

  async function identify(text: string) {
    setLoading(true);
    setStatus("Identifying…");
    try {
      const t = Date.now();
      const lang = await NitroLanguageId.identify(text);
      const possible = await NitroLanguageId.identifyPossible(text);
      setRows((r) => [{ text, lang, possible: possible.slice(0, 3) }, ...r]);
      setStatus(`→ "${lang}" · ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TitleBlock name="@nitro-mlkit/language-id" tagline="Text → BCP-47 language · on-device" />

      <View style={s.chips}>
        {SAMPLES.map((t, i) => (
          <Pressable key={i} style={s.chip} onPress={() => identify(t)} disabled={loading}>
            <Text style={s.chipText} numberOfLines={1}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color={ACCENT} />}
        <Text style={s.status}>{status}</Text>
      </View>

      {rows.map((r, i) => (
        <Card key={i} style={{ marginBottom: 10 }}>
          <View style={s.head}>
            <Text style={s.big}>{r.lang}</Text>
            <Pill accent={ACCENT}>detected</Pill>
          </View>
          <Text style={{ ...T.sub, marginBottom: 10 }} numberOfLines={2}>{r.text}</Text>
          {r.possible.map((p, j) => (
            <View key={j} style={{ marginBottom: 6 }}>
              <View style={s.pRow}>
                <Text style={T.faint}>{p.language}</Text>
                <Text style={T.mono}>{(p.confidence * 100).toFixed(0)}%</Text>
              </View>
              <Meter value={p.confidence} accent={ACCENT} />
            </View>
          ))}
        </Card>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  chips: { gap: 8 },
  chip: {
    backgroundColor: wash(ACCENT, 0.14),
    borderColor: tint(ACCENT, 0.55),
    borderWidth: 2,
    borderRadius: R.md,
    paddingVertical: 11,
    paddingHorizontal: 14,
    ...keycap(3),
  },
  chipText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 16 },
  status: { fontFamily: F.bodySemi, color: C.gold, fontSize: 14, textAlign: "center" },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  big: { color: ACCENT, fontFamily: F.display, fontSize: 26, textTransform: "uppercase" },
  pRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
});
