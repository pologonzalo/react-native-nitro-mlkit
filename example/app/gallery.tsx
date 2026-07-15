import { NitroFace } from "@nitro-mlkit/face-detection";
import { type BatchLabelResult, NitroLabeler } from "@nitro-mlkit/image-labeling";
import * as MediaLibrary from "expo-media-library";
import { type ReactNode, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { buildInsights, type Insights } from "../src/gallery-insights";
import { C, R, T, tint } from "../src/theme";
import { Card, Meter } from "../src/ui";

const ACCENT = "#a78bfa";
// How many photos we scan at most, and how many go in one native batch call.
const SCAN_CAP = 500;
const CHUNK = 40;
const CONCURRENCY = 6;

type Phase = "idle" | "scanning" | "done";

export default function GalleryScreen() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [scanned, setScanned] = useState(0);
  const [total, setTotal] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function scan() {
    setNote(null);
    // 1) Permission — this is the OS gallery prompt the user asked for.
    const perm = await MediaLibrary.requestPermissionsAsync(false, ["photo"]);
    if (!perm.granted) {
      setNote("Gallery permission denied — nothing leaves your phone, we just need to read photos.");
      return;
    }

    setPhase("scanning");
    setProgress(0);
    setInsights(null);

    // 2) Grab the most recent photos.
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: "photo",
      first: SCAN_CAP,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });
    const assets = page.assets;
    setTotal(page.totalCount);
    if (assets.length === 0) {
      setPhase("idle");
      setNote("No photos found in this gallery.");
      return;
    }

    // On Android a MediaLibrary asset.uri (file://content://) is directly
    // readable by the native side. On iOS it's a "ph://" PhotosKit id that
    // ML Kit can't decode — we must resolve each asset's on-disk localUri.
    let uris: string[];
    if (Platform.OS === "ios") {
      uris = [];
      for (let i = 0; i < assets.length; i += 25) {
        const info = await Promise.all(
          assets.slice(i, i + 25).map((a) => MediaLibrary.getAssetInfoAsync(a)),
        );
        uris.push(...info.map((x) => x.localUri ?? x.uri));
      }
    } else {
      uris = assets.map((a) => a.uri);
    }

    // 3) Scan chunk-by-chunk so we can show progress; each chunk is TWO native
    //    batch calls (labels + faces) that run concurrently.
    const labelResults: BatchLabelResult[] = [];
    const faceResults: { faces: { smilingProbability: number }[] }[] = [];
    const t0 = Date.now();
    for (let i = 0; i < uris.length; i += CHUNK) {
      const chunk = uris.slice(i, i + CHUNK);
      const [labels, faces] = await Promise.all([
        NitroLabeler.labelBatch(chunk, {
          concurrency: CONCURRENCY,
          maxLabels: 5,
          confidenceThreshold: 0.55,
        }),
        NitroFace.detectBatch(chunk, CONCURRENCY),
      ]);
      labelResults.push(...labels);
      for (const r of faces) faceResults.push({ faces: r.faces });
      const done = Math.min(i + CHUNK, uris.length);
      setScanned(done);
      setProgress(done / uris.length);
    }
    const ms = Date.now() - t0;
    setElapsed(ms);
    setInsights(buildInsights(labelResults, faceResults, uris.length));
    setPhase("done");
  }

  const perSec =
    insights && elapsed > 0 ? (insights.scanned / (elapsed / 1000)) : 0;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.emoji}>✨</Text>
        <Text style={s.title}>Gallery Wrapped</Text>
        <Text style={T.sub}>
          Point the whole ML Kit suite at your camera roll. Every photo is
          categorised on-device — nothing is uploaded.
        </Text>
      </View>

      {phase === "idle" && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Text style={{ ...T.label, marginBottom: 8 }}>What we do, locally</Text>
            <Bullet emoji="🏷️">Label every photo (400+ ML Kit categories)</Bullet>
            <Bullet emoji="🙂">Detect faces & smiles across the roll</Bullet>
            <Bullet emoji="⚡">All in native batch — no bridge, no network</Bullet>
            <Bullet emoji="🔒">0 bytes leave the device</Bullet>
          </Card>
          <Pressable style={s.cta} onPress={scan}>
            <Text style={s.ctaText}>Scan my gallery ✨</Text>
          </Pressable>
          <Text style={s.privacy}>
            We ask for photo permission, read up to {SCAN_CAP} recent photos, and
            keep everything on-device.
          </Text>
        </>
      )}

      {phase === "scanning" && (
        <Card>
          <Text style={{ ...T.label, marginBottom: 12 }}>Scanning your gallery…</Text>
          <Meter value={progress} accent={ACCENT} />
          <View style={s.scanRow}>
            <ActivityIndicator color={ACCENT} />
            <Text style={s.scanText}>
              {scanned} / {Math.min(total, SCAN_CAP)} photos · {Math.round(progress * 100)}%
            </Text>
          </View>
        </Card>
      )}

      {phase === "done" && insights && (
        <>
          {/* Hero speed flex */}
          <View style={s.hero}>
            <Text style={s.heroNum}>{insights.scanned}</Text>
            <Text style={s.heroLabel}>photos scanned on-device</Text>
            <View style={s.heroStats}>
              <HeroStat value={`${(elapsed / 1000).toFixed(1)}s`} label="total time" />
              <HeroStat value={`${Math.round(perSec)}/s`} label="throughput" />
              <HeroStat value="0" label="bytes uploaded" />
            </View>
          </View>

          {/* Persona */}
          <View style={s.persona}>
            <Text style={s.personaEmoji}>{insights.persona.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.personaTitle}>{insights.persona.title}</Text>
              <Text style={s.personaBlurb}>{insights.persona.blurb}</Text>
            </View>
          </View>

          {/* Themes */}
          {insights.buckets.length > 0 && (
            <Card style={{ marginBottom: 14 }}>
              <Text style={{ ...T.label, marginBottom: 12 }}>Your top themes</Text>
              {insights.buckets.slice(0, 6).map((b) => {
                const frac = b.count / insights.scanned;
                return (
                  <View key={b.key} style={{ marginBottom: 12 }}>
                    <View style={s.themeHead}>
                      <Text style={s.themeLabel}>
                        {b.emoji}  {b.label}
                      </Text>
                      <Text style={T.mono}>
                        {b.count}  ·  {Math.round(frac * 100)}%
                      </Text>
                    </View>
                    <Meter value={frac} accent={ACCENT} />
                  </View>
                );
              })}
            </Card>
          )}

          {/* Faces */}
          <Card style={{ marginBottom: 14 }}>
            <Text style={{ ...T.label, marginBottom: 12 }}>People & smiles</Text>
            <View style={s.grid}>
              <Stat big={insights.faces.totalFaces} label="faces found" />
              <Stat big={insights.faces.photosWithFaces} label="photos with people" />
              <Stat big={insights.faces.smiles} label="smiles 😄" />
              <Stat big={insights.faces.biggestGroup} label="biggest group shot" />
            </View>
          </Card>

          {/* Most common things */}
          {insights.topLabels.length > 0 && (
            <Card style={{ marginBottom: 14 }}>
              <Text style={{ ...T.label, marginBottom: 10 }}>Most common things</Text>
              <View style={s.chips}>
                {insights.topLabels.map((l) => (
                  <View key={l.text} style={s.chip}>
                    <Text style={s.chipText}>
                      {l.emoji !== "•" ? `${l.emoji} ` : ""}
                      {l.text}
                    </Text>
                    <Text style={s.chipCount}>{l.count}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          <Pressable style={s.rescan} onPress={scan}>
            <Text style={s.rescanText}>Scan again 🔄</Text>
          </Pressable>
        </>
      )}

      {note && <Text style={s.note}>{note}</Text>}
    </ScrollView>
  );
}

function Bullet({ emoji, children }: { emoji: string; children: ReactNode }) {
  return (
    <View style={s.bullet}>
      <Text style={s.bulletEmoji}>{emoji}</Text>
      <Text style={s.bulletText}>{children}</Text>
    </View>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.heroStat}>
      <Text style={s.heroStatValue}>{value}</Text>
      <Text style={s.heroStatLabel}>{label}</Text>
    </View>
  );
}

function Stat({ big, label }: { big: number; label: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statBig}>{big}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 16, paddingBottom: 48 },
  header: { marginBottom: 20 },
  emoji: { fontSize: 34, marginBottom: 6 },
  title: { fontSize: 28, fontWeight: "800", color: C.text, letterSpacing: -0.6, marginBottom: 6 },

  bullet: { flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 8 },
  bulletEmoji: { fontSize: 18, width: 22, textAlign: "center" },
  bulletText: { color: C.dim, fontSize: 14, flex: 1 },

  cta: {
    backgroundColor: ACCENT,
    borderRadius: R.lg,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  ctaText: { color: "#0A0A16", fontSize: 16, fontWeight: "800" },
  privacy: { color: C.faint, fontSize: 12, textAlign: "center", lineHeight: 17 },

  scanRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  scanText: { color: C.gold, fontSize: 14, fontVariant: ["tabular-nums"] },

  hero: {
    backgroundColor: tint(ACCENT, 0.14),
    borderColor: tint(ACCENT, 0.5),
    borderWidth: 1,
    borderRadius: R.xl,
    padding: 20,
    alignItems: "center",
    marginBottom: 14,
  },
  heroNum: { fontSize: 52, fontWeight: "900", color: C.text, letterSpacing: -2 },
  heroLabel: { color: C.dim, fontSize: 13, marginTop: -2, marginBottom: 16 },
  heroStats: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
  heroStat: {
    flex: 1,
    backgroundColor: tint("#000000", 0.25),
    borderRadius: R.md,
    paddingVertical: 10,
    alignItems: "center",
  },
  heroStatValue: { color: C.text, fontSize: 18, fontWeight: "800", fontVariant: ["tabular-nums"] },
  heroStatLabel: { color: C.faint, fontSize: 10, marginTop: 2, textAlign: "center" },

  persona: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: R.lg,
    padding: 16,
    marginBottom: 14,
  },
  personaEmoji: { fontSize: 40 },
  personaTitle: { color: C.text, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  personaBlurb: { color: C.dim, fontSize: 13, marginTop: 3, lineHeight: 18 },

  themeHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  themeLabel: { color: C.text, fontSize: 14, fontWeight: "600" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: {
    width: "47%",
    backgroundColor: C.surfaceAlt,
    borderRadius: R.md,
    padding: 14,
  },
  statBig: { color: ACCENT, fontSize: 26, fontWeight: "900" },
  statLabel: { color: C.dim, fontSize: 12, marginTop: 2 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.surfaceAlt,
    borderRadius: R.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: { color: C.text, fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
  chipCount: { color: C.faint, fontSize: 12, fontVariant: ["tabular-nums"] },

  rescan: {
    backgroundColor: tint(ACCENT, 0.16),
    borderColor: tint(ACCENT, 0.5),
    borderWidth: 1,
    borderRadius: R.md,
    paddingVertical: 13,
    alignItems: "center",
  },
  rescanText: { color: ACCENT, fontWeight: "700", fontSize: 14 },

  note: { color: C.gold, fontSize: 13, textAlign: "center", marginTop: 16, lineHeight: 19 },
});
