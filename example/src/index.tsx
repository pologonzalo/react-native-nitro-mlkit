import { type Href, Link } from "expo-router";
import type { ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { C, R, T, tint } from "./theme";

type Feature = {
  href: Href;
  emoji: string;
  title: string;
  tag: string;
  accent: string;
  android?: boolean;
};

const FEATURES: Feature[] = [
  { href: "/faces", emoji: "🙂", title: "Face Detection", tag: "smile · eyes · crop", accent: "#3b82f6" },
  { href: "/facemesh", emoji: "🕸️", title: "Face Mesh", tag: "468 3D points", accent: "#f43f5e" },
  { href: "/selfieseg", emoji: "✂️", title: "Selfie Seg", tag: "foreground mask", accent: "#14b8a6" },
  { href: "/labeling", emoji: "🏷️", title: "Image Labeling", tag: "400+ labels", accent: "#06b6d4" },
  { href: "/objects", emoji: "📦", title: "Object Detection", tag: "boxes + labels", accent: "#22c55e" },
  { href: "/barcode", emoji: "🔳", title: "Barcode / QR", tag: "1D + 2D scan", accent: "#d97706" },
  { href: "/ocr", emoji: "🔤", title: "Text (OCR)", tag: "blocks & lines", accent: "#ec4899" },
  { href: "/pose", emoji: "🧍", title: "Pose Detection", tag: "33 landmarks", accent: "#8b5cf6" },
  { href: "/langid", emoji: "🌐", title: "Language ID", tag: "text → BCP-47", accent: "#0ea5e9" },
  { href: "/smartreply", emoji: "💬", title: "Smart Reply", tag: "chat replies", accent: "#f59e0b", android: true },
];

export default function HomeScreen() {
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.hero}>
        <Text style={s.brand}>nitro·mlkit</Text>
        <Text style={T.sub}>
          The full Google ML Kit suite on Nitro — on-device, JSI, zero bridge.
        </Text>
        <View style={s.badges}>
          <Badge>10 packages</Badge>
          <Badge>on-device</Badge>
          <Badge>native batch</Badge>
        </View>
      </View>

      <Link href="/benchmark" asChild>
        <Pressable style={s.bench}>
          <Text style={s.benchEmoji}>⏱️</Text>
          <View style={{ flex: 1 }}>
            <Text style={T.label}>Benchmark</Text>
            <Text style={T.faint}>Nitro vs bridge vs Expo — same ML Kit engine</Text>
          </View>
          <Text style={s.chevron}>›</Text>
        </Pressable>
      </Link>

      <View style={s.grid}>
        {FEATURES.map((f) => (
          <Link key={f.title} href={f.href} asChild>
            <Pressable
              style={{ ...s.card, borderColor: tint(f.accent, 0.45) }}
            >
              <View style={{ ...s.iconChip, backgroundColor: tint(f.accent, 0.18) }}>
                <Text style={s.icon}>{f.emoji}</Text>
              </View>
              <Text style={s.cardTitle}>{f.title}</Text>
              <Text style={s.cardTag}>{f.tag}</Text>
              {f.android && <Text style={{ ...s.androidTag, color: f.accent }}>Android</Text>}
            </Pressable>
          </Link>
        ))}
      </View>

      <Text style={s.footer}>MIT © Gonzalo Polo · react-native-nitro-mlkit</Text>
    </ScrollView>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <View style={s.badge}>
      <Text style={s.badgeText}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 64, paddingBottom: 40 },
  hero: { marginBottom: 20 },
  brand: { fontSize: 32, fontWeight: "800", color: C.text, letterSpacing: -1, marginBottom: 6 },
  badges: { flexDirection: "row", gap: 8, marginTop: 14 },
  badge: {
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: R.pill,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },
  badgeText: { color: C.dim, fontSize: 12, fontWeight: "600" },
  bench: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: R.lg,
    padding: 14,
    marginBottom: 18,
  },
  benchEmoji: { fontSize: 26 },
  chevron: { color: C.faint, fontSize: 26, fontWeight: "300" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  card: {
    width: "48%",
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    minHeight: 128,
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  icon: { fontSize: 24 },
  cardTitle: { color: C.text, fontSize: 16, fontWeight: "700", letterSpacing: -0.3 },
  cardTag: { color: C.dim, fontSize: 12, marginTop: 3 },
  androidTag: { fontSize: 10, fontWeight: "800", marginTop: 8, letterSpacing: 0.5 },
  footer: { color: C.faint, fontSize: 12, textAlign: "center", marginTop: 28 },
});
