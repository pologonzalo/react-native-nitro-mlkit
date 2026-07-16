import {
  NitroDigitalInk,
  type InkPoint,
  type InkStroke,
} from "@nitro-mlkit/digital-ink";
import { useReducer, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { C, F, R, T, keycap, tint, wash } from "../src/theme";
import { Card, Pill, TitleBlock } from "../src/ui";

const ACCENT = "#d946ef";
const LANGS = ["en-US", "es-ES", "fr-FR", "emoji"];

export default function DigitalInkScreen() {
  const strokesRef = useRef<InkStroke[]>([]);
  const curRef = useRef<InkPoint[]>([]);
  const startRef = useRef(0);
  const [, force] = useReducer((x) => x + 1, 0);

  const [lang, setLang] = useState("en-US");
  const [candidates, setCandidates] = useState<{ text: string; score?: number }[]>([]);
  const [status, setStatus] = useState("Draw something, then Recognize");
  const [loading, setLoading] = useState(false);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        if (startRef.current === 0) startRef.current = Date.now();
        curRef.current = [
          { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY, t: Date.now() - startRef.current },
        ];
        force();
      },
      onPanResponderMove: (e) => {
        curRef.current.push({
          x: e.nativeEvent.locationX,
          y: e.nativeEvent.locationY,
          t: Date.now() - startRef.current,
        });
        force();
      },
      onPanResponderRelease: () => {
        if (curRef.current.length > 0) {
          strokesRef.current.push({ points: curRef.current });
          curRef.current = [];
          force();
        }
      },
    }),
  ).current;

  function clear() {
    strokesRef.current = [];
    curRef.current = [];
    startRef.current = 0;
    setCandidates([]);
    setStatus("Draw something, then Recognize");
    force();
  }

  async function recognize() {
    const strokes = [
      ...strokesRef.current,
      ...(curRef.current.length ? [{ points: curRef.current }] : []),
    ];
    if (strokes.length === 0) {
      setStatus("Draw something first ✍️");
      return;
    }
    setLoading(true);
    setStatus("Recognizing…");
    try {
      const t = Date.now();
      const result = await NitroDigitalInk.recognize(strokes, lang);
      setCandidates(result);
      setStatus(`${result.length} candidate(s) · ${Date.now() - t} ms`);
    } catch (e: any) {
      setStatus("Error ❌");
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  }

  const allStrokes = [
    ...strokesRef.current,
    ...(curRef.current.length ? [{ points: curRef.current }] : []),
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TitleBlock name="@nitro-mlkit/digital-ink" tagline="Handwriting → text · draw with your finger" />

      <View style={s.langRow}>
        {LANGS.map((l) => (
          <Pressable
            key={l}
            onPress={() => setLang(l)}
            style={{
              ...s.langChip,
              backgroundColor: lang === l ? ACCENT : wash(ACCENT, 0.14),
              borderColor: lang === l ? ACCENT : tint(ACCENT, 0.4),
            }}
          >
            <Text style={{ ...s.langText, color: lang === l ? "#1a021f" : ACCENT }}>{l}</Text>
          </Pressable>
        ))}
      </View>

      <View style={s.canvas} {...pan.panHandlers}>
        {allStrokes.map((stroke, si) =>
          stroke.points.map((p, pi) => (
            <View
              key={`${si}-${pi}`}
              style={{
                position: "absolute",
                left: p.x - 2,
                top: p.y - 2,
                width: 5,
                height: 5,
                borderRadius: 3,
                backgroundColor: ACCENT,
              }}
            />
          )),
        )}
        {allStrokes.length === 0 && <Text style={s.canvasHint}>✍️  draw here</Text>}
      </View>

      <View style={s.actions}>
        <Pressable style={s.btnPrimary} onPress={recognize} disabled={loading}>
          <Text style={s.btnPrimaryText}>Recognize</Text>
        </Pressable>
        <Pressable style={s.btnGhost} onPress={clear} disabled={loading}>
          <Text style={s.btnGhostText}>Clear</Text>
        </Pressable>
      </View>

      <View style={s.statusRow}>
        {loading && <ActivityIndicator color={ACCENT} />}
        <Text style={s.status}>{status}</Text>
      </View>

      {candidates.length > 0 && (
        <Card>
          <View style={s.head}>
            <Text style={T.label}>Candidates</Text>
            <Pill accent={ACCENT}>{lang}</Pill>
          </View>
          {candidates.map((c, i) => (
            <View key={i} style={s.candRow}>
              <Text style={{ ...s.candText, color: i === 0 ? C.text : C.dim }}>
                {i === 0 ? "★ " : ""}{c.text}
              </Text>
              {c.score != null && <Text style={T.mono}>{c.score.toFixed(2)}</Text>}
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  langRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  langChip: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: R.pill, borderWidth: 2, ...keycap(3) },
  langText: { fontFamily: F.bodyBold, fontSize: 13 },
  canvas: {
    height: 300,
    borderRadius: R.lg,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.ink,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    ...keycap(4),
  },
  canvasHint: { color: C.faint, fontFamily: F.bodySemi, fontSize: 16 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  btnPrimary: { flex: 1, backgroundColor: ACCENT, paddingVertical: 14, borderRadius: R.md, alignItems: "center", borderWidth: 2, borderColor: C.ink, ...keycap(5) },
  btnPrimaryText: { color: "#1a021f", fontFamily: F.display, fontSize: 16 },
  btnGhost: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: R.md,
    alignItems: "center",
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.surface,
    ...keycap(4),
  },
  btnGhostText: { color: C.dim, fontFamily: F.bodyBold, fontSize: 15 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 14 },
  status: { fontFamily: F.bodySemi, color: C.gold, fontSize: 14, textAlign: "center" },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  candRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.borderSoft },
  candText: { fontFamily: F.bodySemi, fontSize: 17 },
});
