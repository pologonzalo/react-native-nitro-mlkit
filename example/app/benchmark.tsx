import { NitroFace, PerformanceMode } from "@nitro-mlkit/face-detection";
import { RNMLKitFaceDetector } from "@infinitered/react-native-mlkit-face-detection";
import RNMLKitClassic from "@react-native-ml-kit/face-detection";
import { Directory, File, Paths } from "expo-file-system";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { C, F, keycap, R, tint, wash } from "../src/theme";
import { Card } from "../src/ui";

/**
 * THE RACE — three ML Kit face-detection wrappers, one engine, drag-strip UI.
 *   • @nitro-mlkit/face-detection            Nitro / JSI + native batch (this repo)
 *   • @react-native-ml-kit/face-detection    classic bridge (NativeModules)
 *   • @infinitered/react-native-mlkit-face-detection   Expo module
 * Same Google ML Kit + same options everywhere, so the only variable is the
 * JS<->native architecture. The cars move at speeds proportional to the REAL
 * measured sequential time — the race is a replay of the benchmark.
 */

const IMAGE_COUNT = 40;
const GALLERY_SIZE = 150; // snappy but real
const SINGLE_ITERS = 24;
const WARMUP = 10;
const CONCURRENCIES = [2, 4, 8];

const benchDir = new Directory(Paths.document, "bench");
const fileName = (i: number) => `face_${String(i % IMAGE_COUNT).padStart(3, "0")}.jpg`;
const now = () => (globalThis as any).performance?.now?.() ?? Date.now();
const median = (n: number[]) => {
  const s = [...n].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

async function ensureImages(onProgress: (n: number) => void): Promise<string[]> {
  if (!benchDir.exists) benchDir.create();
  const uris: string[] = [];
  for (let i = 0; i < IMAGE_COUNT; i++) {
    const dest = new File(benchDir, fileName(i));
    if (!dest.exists) {
      const gender = i % 2 === 0 ? "men" : "women";
      const url = `https://randomuser.me/api/portraits/${gender}/${i % 100}.jpg`;
      await File.downloadFileAsync(url, dest);
    }
    uris.push(dest.uri);
    onProgress(i + 1);
  }
  return uris;
}

const infineDetector = new RNMLKitFaceDetector({ performanceMode: "fast", landmarkMode: false, contourMode: false, classificationMode: false });
const nitroDetect = (u: string) => NitroFace.detect(u, { performanceMode: PerformanceMode.FAST, landmarks: false, classifications: false, minFaceSize: 0.1, tracking: false });
const classicDetect = (u: string) => RNMLKitClassic.detect(u, { performanceMode: "fast", landmarkMode: "none", classificationMode: "none" });
const infineDetect = (u: string) => infineDetector.detectFaces(u);

type Racer = { key: string; name: string; car: string; accent: string; bridge: boolean };
const RACERS: Racer[] = [
  { key: "nitro", name: "Nitro · JSI", car: "🏎️", accent: C.orange, bridge: false },
  { key: "classic", name: "RN-ML-Kit · bridge", car: "🚗", accent: C.blue, bridge: true },
  { key: "infinite", name: "InfiniteRed · Expo", car: "🚙", accent: "#8B5CF6", bridge: true },
];

type Result = {
  seq: Record<string, number>;
  single: Record<string, number>;
  bestBatch: number;
  bestC: number;
  speedup: number;
};

export default function BenchmarkScreen() {
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [status, setStatus] = useState("Line up the engines and drop the flag.");
  const [result, setResult] = useState<Result | null>(null);
  const [trackW, setTrackW] = useState(0);
  const lanes = useRef(RACERS.map(() => new Animated.Value(0))).current;

  function animateRace(seq: Record<string, number>) {
    const times = RACERS.map((r) => seq[r.key]);
    const minT = Math.min(...times);
    const base = 1500;
    lanes.forEach((v) => v.setValue(0));
    Animated.parallel(
      RACERS.map((r, i) =>
        Animated.timing(lanes[i], {
          toValue: 1,
          duration: base * (seq[r.key] / minT),
          useNativeDriver: true,
        }),
      ),
    ).start();
  }

  async function run() {
    setPhase("running");
    setResult(null);
    try {
      setStatus("Downloading faces…");
      const uris = await ensureImages((n) => setStatus(`Downloading faces… ${n}/${IMAGE_COUNT}`));
      const gallery = Array.from({ length: GALLERY_SIZE }, (_, i) => uris[i % IMAGE_COUNT]);

      setStatus("Initializing…");
      await infineDetector.initialize();
      setStatus("Warming up the engines…");
      for (let i = 0; i < WARMUP; i++) {
        await nitroDetect(uris[i % IMAGE_COUNT]);
        await classicDetect(uris[i % IMAGE_COUNT]);
        await infineDetect(uris[i % IMAGE_COUNT]);
      }

      setStatus("Single-shot laps…");
      const s: Record<string, number[]> = { nitro: [], classic: [], infinite: [] };
      for (let i = 0; i < SINGLE_ITERS; i++) {
        const u = uris[i % IMAGE_COUNT];
        let t = now(); await nitroDetect(u); s.nitro.push(now() - t);
        t = now(); await classicDetect(u); s.classic.push(now() - t);
        t = now(); await infineDetect(u); s.infinite.push(now() - t);
      }
      const single = { nitro: median(s.nitro), classic: median(s.classic), infinite: median(s.infinite) };

      setStatus(`Endurance race · ${GALLERY_SIZE} photos…`);
      const seq: Record<string, number> = {};
      let t = now(); for (const u of gallery) await nitroDetect(u); seq.nitro = now() - t;
      t = now(); for (const u of gallery) await classicDetect(u); seq.classic = now() - t;
      t = now(); for (const u of gallery) await infineDetect(u); seq.infinite = now() - t;

      setStatus("Nitro native-batch run…");
      const batch: Record<number, number> = {};
      for (const c of CONCURRENCIES) {
        t = now(); await NitroFace.detectBatch(gallery, c); batch[c] = now() - t;
      }
      const bestBatch = Math.min(...Object.values(batch));
      const bestC = CONCURRENCIES.find((c) => batch[c] === bestBatch) ?? 4;
      const speedup = Math.min(seq.classic, seq.infinite) / bestBatch;

      console.log("BENCH_RESULT " + JSON.stringify({ gallerySize: GALLERY_SIZE, single, seq, batch }));
      setResult({ seq, single, bestBatch, bestC, speedup });
      setPhase("done");
      setStatus("Photo finish 🏁");
      animateRace(seq);
    } catch (e: any) {
      setStatus("Spun out ❌ · " + String(e?.message ?? e));
      setPhase("idle");
    }
  }

  const winner = result
    ? RACERS.reduce((a, b) => (result.seq[a.key] <= result.seq[b.key] ? a : b)).key
    : null;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.h1}>🏁 The Race</Text>
      <Text style={s.sub}>
        Same Google ML Kit, three JS↔native architectures, {GALLERY_SIZE} faces. Cars move at the real measured speed.
      </Text>

      {/* Track */}
      <View style={s.track} onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}>
        {RACERS.map((r, i) => {
          const carW = 40;
          const x = lanes[i].interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, trackW - carW - 8)] });
          const won = winner === r.key;
          return (
            <View key={r.key} style={s.lane}>
              <View style={s.laneHead}>
                <Text style={s.laneName}>{r.name}</Text>
                {r.bridge && <Text style={s.bridgeTag}>bridge</Text>}
                {result && (
                  <Text style={{ ...s.laneMs, color: r.accent }}>
                    {(result.seq[r.key] / 1000).toFixed(2)}s{won ? "  🏆" : ""}
                  </Text>
                )}
              </View>
              <View style={{ ...s.laneTrack, borderColor: r.accent, backgroundColor: tint(r.accent, 0.1) }}>
                <View style={s.finish} />
                <Animated.Text style={{ ...s.car, transform: [{ translateX: x }] }}>{r.car}</Animated.Text>
              </View>
            </View>
          );
        })}
      </View>

      <Pressable style={{ ...s.flag, opacity: phase === "running" ? 0.6 : 1 }} onPress={run} disabled={phase === "running"}>
        {phase === "running" && <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />}
        <Text style={s.flagText}>{phase === "running" ? "Racing…" : phase === "done" ? "Race again 🏁" : "Drop the flag 🏁"}</Text>
      </Pressable>
      <Text style={s.status}>{status}</Text>

      {result && (
        <>
          <View style={s.trophy}>
            <Text style={s.trophyBig}>{result.speedup.toFixed(1)}×</Text>
            <Text style={s.trophySub}>Nitro native-batch (c={result.bestC}) vs the fastest bridge, on {GALLERY_SIZE} photos</Text>
          </View>

          <Card style={{ marginTop: 14 }}>
            <Text style={s.cardTitle}>Lap times</Text>
            {RACERS.map((r) => (
              <View key={r.key} style={s.statRow}>
                <View style={{ ...s.statDot, backgroundColor: r.accent }} />
                <Text style={s.statName}>{r.name}</Text>
                <Text style={s.statVal}>{result.single[r.key].toFixed(1)}ms<Text style={s.statUnit}> single</Text></Text>
                <Text style={s.statVal}>{(result.seq[r.key] / 1000).toFixed(2)}s<Text style={s.statUnit}> ×{GALLERY_SIZE}</Text></Text>
              </View>
            ))}
            <View style={{ ...s.statRow, borderTopWidth: 2, borderTopColor: C.ink, marginTop: 6, paddingTop: 10 }}>
              <View style={{ ...s.statDot, backgroundColor: C.mint }} />
              <Text style={s.statName}>Nitro · native batch</Text>
              <Text style={{ ...s.statVal, color: C.mintInk }}>{(result.bestBatch / 1000).toFixed(2)}s<Text style={s.statUnit}> best</Text></Text>
            </View>
          </Card>
          <Text style={s.foot}>Same engine · same options · the only variable is the bridge. 100% on-device.</Text>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingTop: 12, paddingBottom: 44 },
  h1: { fontFamily: F.display, fontSize: 30, color: C.ink },
  sub: { fontFamily: F.body, fontSize: 13.5, color: C.dim, marginTop: 2, marginBottom: 20 },

  track: { backgroundColor: C.surface, borderWidth: 2, borderColor: C.ink, borderRadius: R.lg, padding: 14, gap: 14, ...keycap(6) },
  lane: { gap: 6 },
  laneHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  laneName: { fontFamily: F.bodyBold, fontSize: 13, color: C.ink },
  bridgeTag: { fontFamily: F.mono, fontSize: 9, color: C.dim, backgroundColor: C.peg, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  laneMs: { fontFamily: F.mono, fontSize: 12, marginLeft: "auto", fontVariant: ["tabular-nums"] },
  laneTrack: { height: 42, borderRadius: R.md, borderWidth: 2, borderStyle: "dashed", justifyContent: "center", overflow: "hidden" },
  finish: { position: "absolute", right: 4, top: 0, bottom: 0, width: 8, backgroundColor: C.ink, opacity: 0.15 },
  car: { position: "absolute", left: 4, fontSize: 26 },

  flag: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: C.orange, borderWidth: 2, borderColor: C.ink, borderRadius: R.pill, paddingVertical: 15, marginTop: 18, ...keycap(6) },
  flagText: { fontFamily: F.display, fontSize: 17, color: "#fff" },
  status: { fontFamily: F.mono, fontSize: 12, color: C.gold, textAlign: "center", marginTop: 12 },

  trophy: { alignItems: "center", backgroundColor: wash(C.mint, 0.22), borderWidth: 2, borderColor: C.mintInk, borderRadius: R.xl, padding: 18, marginTop: 18, ...keycap(5) },
  trophyBig: { fontFamily: F.display, fontSize: 52, color: C.mintInk, lineHeight: 56 },
  trophySub: { fontFamily: F.bodySemi, fontSize: 12.5, color: C.dim, textAlign: "center", marginTop: 2 },

  cardTitle: { fontFamily: F.display, fontSize: 16, color: C.ink, marginBottom: 10 },
  statRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  statDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: C.ink },
  statName: { fontFamily: F.bodySemi, fontSize: 12.5, color: C.ink, flex: 1 },
  statVal: { fontFamily: F.mono, fontSize: 12, color: C.ink, fontVariant: ["tabular-nums"], width: 92, textAlign: "right" },
  statUnit: { fontFamily: F.mono, fontSize: 9, color: C.faint },
  foot: { fontFamily: F.mono, fontSize: 10.5, color: C.faint, textAlign: "center", marginTop: 16, lineHeight: 15 },
});
