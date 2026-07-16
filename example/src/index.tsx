import { type Href, Link } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FEATURES } from "./features";
import { PlatformBadge } from "./PlatformBadge";
import { C, F, keycap, R, tint, wash } from "./theme";

const href = (route: string) => ("/" + route) as unknown as Href;

export default function HomeScreen() {
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Cover */}
      <Text style={s.logo}>
        GIZM<Text style={s.logoO}>O</Text>
      </Text>
      <Text style={s.tagline}>The Nitro toy lab.</Text>
      <View style={s.chips}>
        <Chip>on-device</Chip>
        <Chip>JSI · no bridge</Chip>
        <Chip mint>0 bytes ↑</Chip>
      </View>

      {/* Gallery Wrapped cartridge */}
      <Link href={href("gallery")} asChild>
        <Pressable style={s.cartridge}>
          <View style={s.cartArt}>
            <Text style={s.cartEmoji}>✨</Text>
            <View style={[s.dot, { backgroundColor: C.orange, top: 12, left: 20 }]} />
            <View style={[s.dot, { backgroundColor: C.blue, top: 30, right: 24 }]} />
            <View style={[s.dot, { backgroundColor: C.mint, bottom: 14, left: 40 }]} />
          </View>
          <Text style={s.cartTitle}>Gallery Wrapped ✨</Text>
          <Text style={s.cartSub}>Scan your whole camera roll on-device → a playful recap + Memories.</Text>
          <View style={s.playPill}>
            <Text style={s.playText}>▶ Play memories</Text>
          </View>
        </Pressable>
      </Link>

      {/* The Race */}
      <Link href={href("benchmark")} asChild>
        <Pressable style={s.race}>
          <Text style={s.raceEmoji}>🏁</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.raceTitle}>The Race</Text>
            <Text style={s.raceSub}>Nitro-JSI vs the classic bridge — watch it run</Text>
          </View>
          <Text style={s.raceGo}>›</Text>
        </Pressable>
      </Link>

      {/* All gizmos */}
      <Text style={s.section}>The toy box</Text>
      <View style={s.grid}>
        {FEATURES.map((f) => (
          <Link key={f.route} href={href(f.route)} asChild>
            <Pressable style={{ ...s.tile, borderColor: C.ink }}>
              <View style={{ ...s.tileChip, backgroundColor: tint(f.accent, 0.18) }}>
                <Text style={s.tileEmoji}>{f.emoji}</Text>
              </View>
              <Text style={s.tileTitle} numberOfLines={1}>{f.title}</Text>
              <Text style={s.tileTag} numberOfLines={1}>{f.tag}</Text>
              <View style={s.tileBadge}>
                <PlatformBadge androidOnly={f.android} size={14} />
              </View>
            </Pressable>
          </Link>
        ))}
      </View>

      <Text style={s.footer}>Swipe from the left edge or tap ☰ for the toy box.</Text>
    </ScrollView>
  );
}

function Chip({ children, mint }: { children: ReactNode; mint?: boolean }) {
  return (
    <View style={{ ...s.chip, ...(mint ? { backgroundColor: C.mint, borderColor: C.mintInk } : {}) }}>
      <Text style={{ ...s.chipText, ...(mint ? { color: "#08301F" } : {}) }}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 8, paddingBottom: 44 },
  logo: { fontFamily: F.display, fontSize: 56, color: C.orange, lineHeight: 60, letterSpacing: -1 },
  logoO: { color: C.blue },
  tagline: { fontFamily: F.displaySemi, fontSize: 18, color: C.ink, marginTop: -2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12, marginBottom: 20 },
  chip: { backgroundColor: C.surface, borderWidth: 2, borderColor: C.ink, borderRadius: R.pill, paddingVertical: 4, paddingHorizontal: 11, ...keycap(3) },
  chipText: { fontFamily: F.mono, fontSize: 11, color: C.ink },

  cartridge: { backgroundColor: C.surface, borderWidth: 2, borderColor: C.ink, borderRadius: R.xl, padding: 16, marginBottom: 14, ...keycap(6) },
  cartArt: { height: 92, borderRadius: R.lg, backgroundColor: "#FBE3F1", borderWidth: 2, borderColor: C.ink, alignItems: "center", justifyContent: "center", marginBottom: 12, overflow: "hidden" },
  cartEmoji: { fontSize: 40 },
  dot: { position: "absolute", width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: C.ink },
  cartTitle: { fontFamily: F.display, fontSize: 22, color: C.ink },
  cartSub: { fontFamily: F.bodySemi, fontSize: 13, color: C.dim, marginTop: 3, marginBottom: 14 },
  playPill: { alignSelf: "flex-start", backgroundColor: C.orange, borderWidth: 2, borderColor: C.ink, borderRadius: R.pill, paddingVertical: 10, paddingHorizontal: 20, ...keycap(4) },
  playText: { fontFamily: F.display, fontSize: 15, color: "#fff" },

  race: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: wash(C.blue, 0.14), borderWidth: 2, borderColor: C.blue, borderRadius: R.lg, padding: 15, marginBottom: 22, ...keycap(4) },
  raceEmoji: { fontSize: 28 },
  raceTitle: { fontFamily: F.display, fontSize: 17, color: C.ink },
  raceSub: { fontFamily: F.bodySemi, fontSize: 12, color: C.dim, marginTop: 1 },
  raceGo: { fontFamily: F.display, fontSize: 24, color: C.blue },

  section: { fontFamily: F.bodyBold, fontSize: 13, color: C.dim, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { width: "47%", backgroundColor: C.surface, borderWidth: 2, borderRadius: R.lg, padding: 13, ...keycap(5) },
  tileChip: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 9 },
  tileEmoji: { fontSize: 21 },
  tileTitle: { fontFamily: F.display, fontSize: 15, color: C.ink },
  tileTag: { fontFamily: F.body, fontSize: 11.5, color: C.dim, marginTop: 1 },
  tileBadge: { position: "absolute", top: 12, right: 12 },

  footer: { fontFamily: F.mono, fontSize: 11, color: C.faint, textAlign: "center", marginTop: 26 },
});
