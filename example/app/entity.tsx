import { NitroEntityExtraction } from "@nitro-mlkit/entity-extraction";
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
import { C, F, R, T, keycap, tint, wash } from "../src/theme";
import { Card, Pill, TitleBlock } from "../src/ui";

const ACCENT = "#a855f7";
const SAMPLES = [
  "Call me at +1 202-555-0147 or email john@example.com",
  "The meeting is on March 3rd at 5pm",
  "Track package 1Z999AA10123456784 — it cost $49.99",
  "Read more at https://github.com/nitro-mlkit today",
];

type Entity = { type: string; text: string; start: number; end: number };
type Row = { text: string; entities: Entity[]; ms: number };

const EMOJI: Record<string, string> = {
  address: "📍",
  email: "✉️",
  phone: "📞",
  url: "🔗",
  date_time: "📅",
  money: "💰",
  flight_number: "✈️",
  iban: "🏦",
  isbn: "📚",
  payment_card: "💳",
  tracking_number: "📦",
  unknown: "❔",
};

export default function EntityScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState("Tap a sentence");
  const [loading, setLoading] = useState(false);

  async function annotate(text: string) {
    setLoading(true);
    setStatus("Extracting (downloads model on first use)…");
    try {
      const t = Date.now();
      const entities = await NitroEntityExtraction.annotate(text);
      setRows((r) => [{ text, entities, ms: Date.now() - t }, ...r]);
      setStatus(`${entities.length} entities · ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TitleBlock name="@nitro-mlkit/entity-extraction" tagline="Find phones, emails, dates, money… · Android-only" />

      {SAMPLES.map((t, i) => (
        <Pressable key={i} style={s.chip} onPress={() => annotate(t)} disabled={loading}>
          <Text style={s.chipText} numberOfLines={2}>{t}</Text>
        </Pressable>
      ))}

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color={ACCENT} />}
        <Text style={s.status}>{status}</Text>
      </View>

      {rows.map((r, i) => (
        <Card key={i} style={{ marginBottom: 10 }}>
          <Text style={{ ...T.sub, marginBottom: 10 }}>{r.text}</Text>
          {r.entities.length === 0 ? (
            <Text style={T.faint}>No entities found · {r.ms} ms</Text>
          ) : (
            r.entities.map((e, j) => (
              <View key={j} style={s.entRow}>
                <Text style={s.entText} numberOfLines={1}>
                  {EMOJI[e.type] ?? "❔"} {e.text}
                </Text>
                <Pill accent={ACCENT}>{e.type}</Pill>
              </View>
            ))
          )}
        </Card>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  chip: {
    backgroundColor: wash(ACCENT, 0.12),
    borderColor: tint(ACCENT, 0.5),
    borderWidth: 2,
    borderRadius: R.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    ...keycap(3),
  },
  chipText: { color: C.text, fontFamily: F.bodySemi, fontSize: 13.5 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 16 },
  status: { fontFamily: F.bodySemi, color: C.gold, fontSize: 14, textAlign: "center" },
  entRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.borderSoft,
  },
  entText: { color: C.text, fontFamily: F.bodySemi, fontSize: 14, flex: 1 },
});
