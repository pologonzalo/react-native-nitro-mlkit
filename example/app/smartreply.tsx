import {
  NitroSmartReply,
  SmartReplyStatus,
  type ConversationMessage,
} from "@nitro-mlkit/smart-reply";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { C, R, T, tint } from "../src/theme";
import { Card, Pill, TitleBlock } from "../src/ui";

const ACCENT = "#f59e0b";

// Each sample ends with a REMOTE-user message; Smart Reply suggests replies.
const SAMPLES: { label: string; messages: string[] }[] = [
  { label: "Lunch", messages: ["Hey! Want to grab lunch today?"] },
  { label: "Weekend", messages: ["Hey, how's it going?", "Are you free this weekend?"] },
  { label: "Good news", messages: ["I just got the job! 🎉"] },
  { label: "Running late", messages: ["I'm stuck in traffic, running 15 min late"] },
  { label: "Dinner", messages: ["Pizza or sushi tonight?"] },
];

function build(messages: string[]): ConversationMessage[] {
  const base = Date.now() - messages.length * 60_000;
  return messages.map((text, i) => ({
    text,
    timestamp: base + i * 60_000,
    isLocalUser: false,
    userId: "friend",
  }));
}

type Row = { prompt: string; suggestions: string[]; note: string };

export default function SmartReplyScreen() {
  const available = NitroSmartReply.isAvailable();
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState(available ? "Tap a conversation" : "Android-only");
  const [loading, setLoading] = useState(false);

  async function suggest(sample: { label: string; messages: string[] }) {
    setLoading(true);
    setStatus("Thinking…");
    try {
      const t = Date.now();
      const result = await NitroSmartReply.suggestReplies(build(sample.messages));
      const ms = Date.now() - t;
      const note =
        result.status === SmartReplyStatus.SUCCESS
          ? `${result.suggestions.length} replies · ${ms} ms`
          : result.status === SmartReplyStatus.NO_REPLY
            ? `no reply · ${ms} ms`
            : `unsupported language · ${ms} ms`;
      setRows((r) => [
        { prompt: sample.messages[sample.messages.length - 1], suggestions: result.suggestions, note },
        ...r,
      ]);
      setStatus(`→ ${note}`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TitleBlock name="@nitro-mlkit/smart-reply" tagline="Chat → suggested replies · Android-only" />

      {!available && (
        <Card style={{ marginBottom: 14 }}>
          <Text style={T.sub}>
            Google ML Kit provides Smart Reply on Android only, so this screen is
            inert on iOS.
          </Text>
        </Card>
      )}

      <View style={s.chips}>
        {SAMPLES.map((sample, i) => (
          <Pressable key={i} style={s.chip} onPress={() => suggest(sample)} disabled={loading || !available}>
            <Text style={s.chipText} numberOfLines={1}>
              {sample.label}: “{sample.messages[sample.messages.length - 1]}”
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color={ACCENT} />}
        <Text style={s.status}>{status}</Text>
      </View>

      {rows.map((r, i) => (
        <Card key={i} style={{ marginBottom: 10 }}>
          <Text style={{ ...T.sub, marginBottom: 12 }} numberOfLines={2}>💬 {r.prompt}</Text>
          <View style={s.suggestions}>
            {r.suggestions.length === 0 ? (
              <Text style={T.faint}>{r.note}</Text>
            ) : (
              r.suggestions.map((sug, j) => (
                <View key={j} style={s.suggestion}>
                  <Text style={s.suggestionText}>{sug}</Text>
                </View>
              ))
            )}
          </View>
          <Text style={{ ...T.faint, marginTop: 10 }}>{r.note}</Text>
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
    backgroundColor: tint(ACCENT, 0.14),
    borderColor: tint(ACCENT, 0.4),
    borderWidth: 1,
    borderRadius: R.md,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  chipText: { color: C.text, fontSize: 13, fontWeight: "600" },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 16 },
  status: { color: C.gold, fontSize: 14 },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  suggestion: {
    backgroundColor: tint(ACCENT, 0.16),
    borderColor: ACCENT,
    borderWidth: 1,
    borderRadius: R.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  suggestionText: { color: C.gold, fontSize: 14, fontWeight: "600" },
});
