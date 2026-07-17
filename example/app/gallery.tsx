import { NitroFace, PerformanceMode } from "@nitro-mlkit/face-detection";
import { NitroLabeler } from "@nitro-mlkit/image-labeling";
import { Image as ExpoImage } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import { type ReactNode, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  buildInsights,
  buildStories,
  type Insights,
  type Memory,
  type ScannedPhoto,
} from "../src/gallery-insights";
import { StoryPlayer } from "../src/StoryPlayer";
import { C, F, R, T, keycap, wash } from "../src/theme";
import { Card, Meter } from "../src/ui";

const ACCENT = "#8B5CF6";
// How many photos we scan at most, and how many go in one native batch call.
const SCAN_CAP = 1000;
const CHUNK = 40;
const CONCURRENCY = 6;

type Phase = "idle" | "scanning" | "done";

export default function GalleryScreen() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [scanned, setScanned] = useState(0);
  const [total, setTotal] = useState(0);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [showStories, setShowStories] = useState(false);
  const [storyStart, setStoryStart] = useState(0);
  const [report, setReport] = useState<string | null>(null);

  const slides = useMemo(() => (insights ? buildStories(insights) : []), [insights]);

  function openStories(startKey?: string) {
    const idx = startKey ? slides.findIndex((s) => s.key === startKey) : 0;
    setStoryStart(idx >= 0 ? idx : 0);
    setShowStories(true);
  }

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
    setReport(null);

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

    const cap = Math.min(assets.length, SCAN_CAP);
    setTotal(cap);

    // 3) Scan chunk-by-chunk. For each chunk we resolve its URIs *right before*
    //    processing it (so progress moves from the very first chunk instead of
    //    stalling on a big up-front pass) and run two native batch calls
    //    concurrently, merging labels + faces + capture time per photo.
    //    On Android asset.uri is directly readable. On iOS it's a "ph://"
    //    PhotosKit id ML Kit can't decode, so we resolve each asset's on-disk
    //    localUri — WITHOUT triggering an iCloud download (that's what made it
    //    look frozen at 0/N). Photos that live only in iCloud are skipped.
    const photos: ScannedPhoto[] = [];
    let skipped = 0;
    const t0 = Date.now();
    for (let i = 0; i < cap; i += CHUNK) {
      const slice = assets.slice(i, i + CHUNK);
      const chunkTimes = slice.map((a) => a.creationTime ?? 0);

      let chunkUris: (string | null)[];
      if (Platform.OS === "ios") {
        const infos = await Promise.all(
          slice.map((a) =>
            MediaLibrary.getAssetInfoAsync(a, { shouldDownloadFromNetwork: false }).catch(
              () => null,
            ),
          ),
        );
        chunkUris = infos.map((x) => x?.localUri ?? null);
      } else {
        chunkUris = slice.map((a) => a.uri);
      }

      // Only decode what we could resolve; remember each one's slot in the slice.
      const decodable: string[] = [];
      const slotOf: number[] = [];
      for (let j = 0; j < chunkUris.length; j++) {
        const u = chunkUris[j];
        if (u) {
          decodable.push(u);
          slotOf.push(j);
        } else {
          skipped++;
        }
      }

      const [labels, faces] = decodable.length
        ? await Promise.all([
            NitroLabeler.labelBatch(decodable, {
              concurrency: CONCURRENCY,
              maxLabels: 5,
              confidenceThreshold: 0.55,
            }),
            // classifications:true → real smilingProbability per face (the whole
            // point of the beta face package); performanceMode FAST keeps it snappy.
            NitroFace.detectBatch(decodable, CONCURRENCY, {
              performanceMode: PerformanceMode.FAST,
              landmarks: false,
              classifications: true,
              minFaceSize: 0.1,
              tracking: false,
            }),
          ])
        : [[], []];
      const labelByIdx = new Map<number, { text: string }[]>();
      for (const r of labels) labelByIdx.set(r.index, r.labels);
      const faceByIdx = new Map<number, { smilingProbability: number }[]>();
      for (const r of faces) faceByIdx.set(r.index, r.faces);

      for (let k = 0; k < decodable.length; k++) {
        const fs = faceByIdx.get(k) ?? [];
        photos.push({
          uri: decodable[k],
          time: chunkTimes[slotOf[k]] ?? 0,
          labels: (labelByIdx.get(k) ?? []).map((l) => l.text.toLowerCase()),
          faces: fs.length,
          smiles: fs.filter((f) => f.smilingProbability > 0.6).length,
        });
      }
      const done = Math.min(i + CHUNK, cap);
      setScanned(done);
      setProgress(done / cap);
    }
    const elapsed = Date.now() - t0;
    if (skipped > 0) {
      setNote(
        `${skipped} photo${skipped === 1 ? "" : "s"} are stored only in iCloud and were skipped (we never download them).`,
      );
    }
    const ins = buildInsights(photos, elapsed);
    setInsights(ins);

    // Calibration report — a compact JSON the user can copy/share back so we can
    // tune the memory rules against the labels their real gallery actually fires.
    const labelCount = new Map<string, number>();
    for (const p of photos) for (const l of p.labels) labelCount.set(l, (labelCount.get(l) ?? 0) + 1);
    const labels = Object.fromEntries(
      [...labelCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 80),
    );
    setReport(
      JSON.stringify(
        {
          scanned: photos.length,
          iCloudSkipped: skipped,
          elapsedMs: elapsed,
          distinctLabels: labelCount.size,
          labels, // top 80 labels → count (the key calibration signal)
          memories: Object.fromEntries(ins.memories.map((m) => [m.key, m.count])),
          faces: {
            total: ins.faces.totalFaces,
            smiling: ins.faces.smiles,
            withFaces: ins.faces.photosWithFaces,
            biggestGroup: ins.faces.biggestGroup,
          },
        },
        null,
        2,
      ),
    );
    setPhase("done");
  }

  const perSec =
    insights && insights.elapsedMs > 0 ? insights.scanned / (insights.elapsedMs / 1000) : 0;

  return (
    <>
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
              <Bullet emoji="🧠">Sort them into smart "memories" — parties, pets, beaches…</Bullet>
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
                <HeroStat value={`${(insights.elapsedMs / 1000).toFixed(1)}s`} label="total time" />
                <HeroStat value={`${Math.round(perSec)}/s`} label="throughput" />
                <HeroStat value="0" label="bytes uploaded" />
              </View>
            </View>

            {/* Memories / Stories CTA */}
            <Pressable style={s.stories} onPress={() => openStories()}>
              <Text style={s.storiesEmoji}>▶</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.storiesTitle}>Play your memories</Text>
                <Text style={s.storiesSub}>A Google-Photos-style recap, built on-device</Text>
              </View>
            </Pressable>

            {/* Persona */}
            <View style={s.persona}>
              <Text style={s.personaEmoji}>{insights.persona.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.personaTitle}>{insights.persona.title}</Text>
                <Text style={s.personaBlurb}>{insights.persona.blurb}</Text>
              </View>
            </View>

            {/* Memories */}
            {insights.memories.length > 0 && (
              <>
                <Text style={s.section}>
                  {insights.memories.length} memories found
                </Text>
                {insights.memories.map((m) => (
                  <MemoryCard key={m.key} m={m} onPress={() => openStories(`mem-${m.key}`)} />
                ))}
              </>
            )}

            {/* Faces */}
            <Card style={{ marginTop: 14, marginBottom: 14 }}>
              <Text style={{ ...T.label, marginBottom: 12 }}>People & smiles</Text>
              <View style={s.grid}>
                <Stat big={insights.faces.totalFaces} label="faces found" />
                <Stat big={insights.faces.photosWithFaces} label="photos with people" />
                <Stat big={insights.faces.smiles} label="smiley photos 😄" />
                <Stat big={insights.faces.biggestGroup} label="biggest group shot" />
              </View>
            </Card>

            {report && (
              <Card style={{ marginBottom: 14 }}>
                <View style={s.repHead}>
                  <Text style={T.label}>🧪 Calibration report</Text>
                  <Pressable style={s.repBtn} onPress={() => Share.share({ message: report })}>
                    <Text style={s.repBtnText}>Share ↗</Text>
                  </Pressable>
                </View>
                <Text style={{ ...T.faint, marginBottom: 10 }}>
                  Copy or share this and paste it back to me — I'll tune the memories to your real labels.
                </Text>
                <ScrollView style={s.repBox} nestedScrollEnabled showsVerticalScrollIndicator>
                  <Text style={s.repJson} selectable>{report}</Text>
                </ScrollView>
              </Card>
            )}

            <Pressable style={s.rescan} onPress={scan}>
              <Text style={s.rescanText}>Scan again 🔄</Text>
            </Pressable>
          </>
        )}

        {note && <Text style={s.note}>{note}</Text>}
      </ScrollView>

      {showStories && insights && (
        <StoryPlayer
          slides={slides}
          startIndex={storyStart}
          onClose={() => setShowStories(false)}
        />
      )}
    </>
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

/** A memory tile: real cover photo + title + count, taps into the story. */
function MemoryCard({ m, onPress }: { m: Memory; onPress: () => void }) {
  return (
    <Pressable style={s.memCard} onPress={onPress}>
      {m.photos[0] ? (
        <ExpoImage source={{ uri: m.photos[0] }} style={s.memCover} contentFit="cover" transition={150} />
      ) : (
        <View style={{ ...s.memCover, backgroundColor: wash(m.accent, 0.2), alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 26 }}>{m.emoji}</Text>
        </View>
      )}
      <View style={s.memBody}>
        <Text style={s.memTitle} numberOfLines={1}>{m.emoji}  {m.title}</Text>
        <Text style={s.memBlurb} numberOfLines={2}>{m.blurb}</Text>
      </View>
      <View style={{ ...s.memCount, backgroundColor: wash(m.accent, 0.18), borderColor: m.accent }}>
        <Text style={{ ...s.memCountText, color: m.accent }}>{m.count}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 16, paddingBottom: 48 },
  header: { marginBottom: 20 },
  emoji: { fontSize: 34, marginBottom: 6 },
  title: { fontFamily: F.display, fontSize: 30, color: C.text, letterSpacing: -0.6, marginBottom: 6 },

  bullet: { flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 8 },
  bulletEmoji: { fontSize: 18, width: 22, textAlign: "center" },
  bulletText: { color: C.dim, fontFamily: F.body, fontSize: 14, flex: 1 },

  cta: {
    backgroundColor: ACCENT,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: R.lg,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    ...keycap(6),
  },
  ctaText: { color: "#fff", fontFamily: F.display, fontSize: 18 },
  privacy: { color: C.faint, fontFamily: F.body, fontSize: 12, textAlign: "center", lineHeight: 17 },

  scanRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  scanText: { color: C.gold, fontFamily: F.mono, fontSize: 13, fontVariant: ["tabular-nums"] },

  stories: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: ACCENT,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: R.lg,
    padding: 16,
    marginBottom: 14,
    ...keycap(6),
  },
  storiesEmoji: {
    color: ACCENT,
    fontSize: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    textAlign: "center",
    lineHeight: 36,
    overflow: "hidden",
  },
  storiesTitle: { color: "#fff", fontFamily: F.display, fontSize: 18 },
  storiesSub: { color: "#FFFFFFDD", fontFamily: F.bodySemi, fontSize: 12, marginTop: 1 },

  hero: {
    backgroundColor: wash(ACCENT, 0.16),
    borderColor: ACCENT,
    borderWidth: 2,
    borderRadius: R.xl,
    padding: 20,
    alignItems: "center",
    marginBottom: 14,
    ...keycap(5),
  },
  heroNum: { fontFamily: F.display, fontSize: 54, color: C.ink, letterSpacing: -2, lineHeight: 58 },
  heroLabel: { color: C.dim, fontFamily: F.bodySemi, fontSize: 13, marginBottom: 16 },
  heroStats: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
  heroStat: {
    flex: 1,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: R.md,
    paddingVertical: 10,
    alignItems: "center",
  },
  heroStatValue: { color: C.ink, fontFamily: F.display, fontSize: 18, fontVariant: ["tabular-nums"] },
  heroStatLabel: { color: C.faint, fontFamily: F.body, fontSize: 10, marginTop: 2, textAlign: "center" },

  persona: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.surface,
    borderColor: C.ink,
    borderWidth: 2,
    borderRadius: R.lg,
    padding: 16,
    marginBottom: 18,
    ...keycap(5),
  },
  personaEmoji: { fontSize: 40 },
  personaTitle: { color: C.text, fontFamily: F.display, fontSize: 18 },
  personaBlurb: { color: C.dim, fontFamily: F.body, fontSize: 13, marginTop: 3, lineHeight: 18 },

  section: { fontFamily: F.bodyBold, fontSize: 13, color: C.dim, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 12 },

  memCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: R.lg,
    padding: 10,
    marginBottom: 12,
    ...keycap(5),
  },
  memCover: { width: 68, height: 68, borderRadius: R.md, borderWidth: 2, borderColor: C.ink, backgroundColor: C.surfaceAlt },
  memBody: { flex: 1 },
  memTitle: { fontFamily: F.display, fontSize: 16, color: C.ink },
  memBlurb: { fontFamily: F.body, fontSize: 12.5, color: C.dim, marginTop: 2, lineHeight: 17 },
  memCount: { minWidth: 40, height: 34, borderRadius: R.pill, borderWidth: 2, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  memCountText: { fontFamily: F.bodyBold, fontSize: 15, fontVariant: ["tabular-nums"] },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: {
    width: "47%",
    backgroundColor: C.surfaceAlt,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: R.md,
    padding: 14,
  },
  statBig: { color: ACCENT, fontFamily: F.display, fontSize: 28 },
  statLabel: { color: C.dim, fontFamily: F.body, fontSize: 12, marginTop: 2 },

  repHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  repBtn: {
    backgroundColor: wash(C.blue, 0.16),
    borderColor: C.blue,
    borderWidth: 2,
    borderRadius: R.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
    ...keycap(3),
  },
  repBtnText: { color: C.blue, fontFamily: F.bodyBold, fontSize: 13 },
  repBox: {
    maxHeight: 220,
    backgroundColor: C.surfaceAlt,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: R.md,
    padding: 12,
  },
  repJson: { fontFamily: F.mono, fontSize: 11, color: C.ink, lineHeight: 16 },

  rescan: {
    backgroundColor: wash(ACCENT, 0.16),
    borderColor: ACCENT,
    borderWidth: 2,
    borderRadius: R.md,
    paddingVertical: 13,
    alignItems: "center",
    ...keycap(4),
  },
  rescanText: { color: ACCENT, fontFamily: F.bodyBold, fontSize: 14 },

  note: { color: C.gold, fontFamily: F.bodySemi, fontSize: 13, textAlign: "center", marginTop: 16, lineHeight: 19 },
});
