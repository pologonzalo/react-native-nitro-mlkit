import { NitroFace, PerformanceMode } from "@nitro-mlkit/face-detection";
import { RNMLKitFaceDetector } from "@infinitered/react-native-mlkit-face-detection";
import RNMLKitClassic from "@react-native-ml-kit/face-detection";
import { Directory, File, Paths } from "expo-file-system";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

/**
 * Benchmark harness — three ML Kit face-detection wrappers, one engine.
 *
 *   • @nitro-mlkit/face-detection      Nitro / JSI + native batch (this repo)
 *   • @react-native-ml-kit/face-detection   classic bridge (NativeModules)
 *   • @infinitered/react-native-mlkit-face-detection   Expo module
 *
 * All three wrap the SAME Google ML Kit face-detection with the SAME options
 * (fast mode, no landmarks/contours/classification), so the only variable is
 * the JS<->native architecture.
 *
 * Images are downloaded once into the app sandbox (documentDirectory), so this
 * runs identically on Android and a physical iOS device — no adb push needed.
 */

const IMAGE_COUNT = 50; // distinct faces
const GALLERY_SIZE = 500; // simulated gallery to scan
const SINGLE_ITERS = 40;
const WARMUP = 12;
const CONCURRENCIES = [1, 2, 4, 8, 16]; // batch sweep

const benchDir = new Directory(Paths.document, "bench");

function fileName(i: number) {
  return `face_${String(i % IMAGE_COUNT).padStart(3, "0")}.jpg`;
}

/** Download IMAGE_COUNT distinct real faces into the sandbox (idempotent). */
async function ensureImages(onProgress: (n: number) => void): Promise<string[]> {
  if (!benchDir.exists) benchDir.create();
  const uris: string[] = [];
  for (let i = 0; i < IMAGE_COUNT; i++) {
    const dest = new File(benchDir, fileName(i));
    if (!dest.exists) {
      const gender = Math.floor(i / 100) % 2 === 0 ? "men" : "women";
      const half = i % 100;
      const url = `https://randomuser.me/api/portraits/${gender}/${half}.jpg`;
      await File.downloadFileAsync(url, dest);
    }
    uris.push(dest.uri);
    onProgress(i + 1);
  }
  return uris;
}

const now = () => (globalThis as any).performance?.now?.() ?? Date.now();
function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ─── Adapters (identical options everywhere) ───────────────────────────────

const infineDetector = new RNMLKitFaceDetector({
  performanceMode: "fast",
  landmarkMode: false,
  contourMode: false,
  classificationMode: false,
});

const nitroDetect = (uri: string) =>
  NitroFace.detect(uri, {
    performanceMode: PerformanceMode.FAST,
    landmarks: false,
    classifications: false,
    minFaceSize: 0.1,
    tracking: false,
  });

const classicDetect = (uri: string) =>
  RNMLKitClassic.detect(uri, {
    performanceMode: "fast",
    landmarkMode: "none",
    classificationMode: "none",
  });

const infineDetect = (uri: string) => infineDetector.detectFaces(uri);

type Row = { label: string; value: string; hi?: boolean };

export default function BenchmarkScreen() {
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [rows, setRows] = useState<Row[]>([]);

  async function run() {
    setRunning(true);
    setRows([]);
    const out: Row[] = [];
    const push = (label: string, value: string, hi = false) => {
      out.push({ label, value, hi });
      setRows([...out]);
    };

    try {
      setStatus("Downloading faces…");
      const uris = await ensureImages((n) =>
        setStatus(`Downloading faces… ${n}/${IMAGE_COUNT}`),
      );
      const gallery = Array.from({ length: GALLERY_SIZE }, (_, i) => uris[i % IMAGE_COUNT]);

      setStatus("Initializing detectors…");
      await infineDetector.initialize();

      // Warm-up (load model, JIT)
      setStatus("Warming up…");
      for (let i = 0; i < WARMUP; i++) {
        await nitroDetect(uris[i % IMAGE_COUNT]);
        await classicDetect(uris[i % IMAGE_COUNT]);
        await infineDetect(uris[i % IMAGE_COUNT]);
      }

      // ── 1. Single-call latency (median) ──
      setStatus("Single-call latency…");
      const sN: number[] = [];
      const sC: number[] = [];
      const sI: number[] = [];
      for (let i = 0; i < SINGLE_ITERS; i++) {
        const u = uris[i % IMAGE_COUNT];
        let t = now(); await nitroDetect(u); sN.push(now() - t);
        t = now(); await classicDetect(u); sC.push(now() - t);
        t = now(); await infineDetect(u); sI.push(now() - t);
      }
      const nMed = median(sN), cMed = median(sC), iMed = median(sI);
      push("Single — Nitro", `${nMed.toFixed(2)} ms`, true);
      push("Single — RN-ML-Kit (bridge)", `${cMed.toFixed(2)} ms`);
      push("Single — InfiniteRed (Expo)", `${iMed.toFixed(2)} ms`);

      // ── 2. Sequential scan of GALLERY_SIZE (all three) ──
      setStatus(`Sequential ×${GALLERY_SIZE}…`);
      let t = now();
      for (const u of gallery) await nitroDetect(u);
      const seqN = now() - t;
      t = now();
      for (const u of gallery) await classicDetect(u);
      const seqC = now() - t;
      t = now();
      for (const u of gallery) await infineDetect(u);
      const seqI = now() - t;
      push(`Seq ×${GALLERY_SIZE} — Nitro`, `${seqN.toFixed(0)} ms`, true);
      push(`Seq ×${GALLERY_SIZE} — RN-ML-Kit`, `${seqC.toFixed(0)} ms`);
      push(`Seq ×${GALLERY_SIZE} — InfiniteRed`, `${seqI.toFixed(0)} ms`);

      // ── 3. Native batch, concurrency sweep (Nitro only) ──
      const batch: Record<number, number> = {};
      for (const c of CONCURRENCIES) {
        setStatus(`Batch ×${GALLERY_SIZE} @concurrency ${c}…`);
        t = now();
        await NitroFace.detectBatch(gallery, c);
        batch[c] = now() - t;
        push(`Batch ×${GALLERY_SIZE} — Nitro @${c}`, `${batch[c].toFixed(0)} ms`, true);
      }
      const bestBatch = Math.min(...Object.values(batch));
      const bestC = CONCURRENCIES.find((c) => batch[c] === bestBatch);
      push(
        "Batch best vs fastest competitor",
        `${(Math.min(seqC, seqI) / bestBatch).toFixed(2)}× (c=${bestC})`,
        true,
      );

      console.log(
        "BENCH_RESULT " +
          JSON.stringify({
            gallerySize: GALLERY_SIZE,
            singleIters: SINGLE_ITERS,
            single: { nitro: nMed, classic: cMed, infinite: iMed },
            sequential: { nitro: seqN, classic: seqC, infinite: seqI },
            batch,
          }),
      );
      setStatus("Done ✅");
    } catch (e: any) {
      push("ERROR", String(e?.message ?? e));
      console.log("BENCH_ERROR " + String(e?.message ?? e));
      setStatus("Error ❌");
    } finally {
      setRunning(false);
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Face Detection Benchmark</Text>
      <Text style={s.subtitle}>
        Nitro vs bridge vs Expo · same ML Kit · {GALLERY_SIZE} images
      </Text>

      <Pressable
        style={running ? s.btnDisabled : s.btn}
        onPress={run}
        disabled={running}
      >
        <Text style={s.btnText}>{running ? "Running…" : "Run Benchmark"}</Text>
      </Pressable>

      <View style={s.statusRow}>
        {running && <ActivityIndicator color="#1a6dff" />}
        <Text style={s.status}>{status}</Text>
      </View>

      <View style={s.results}>
        {rows.map((r, i) => (
          <View key={i} style={s.row}>
            <Text style={s.rowLabel}>{r.label}</Text>
            <Text style={r.hi ? s.rowValueHi : s.rowValue}>{r.value}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A1A" },
  content: { padding: 20, paddingTop: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "bold", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 12, color: "#888", textAlign: "center", marginBottom: 20 },
  btn: { backgroundColor: "#1a6dff", padding: 16, borderRadius: 10, alignItems: "center" },
  btnDisabled: { backgroundColor: "#1a6dff", opacity: 0.5, padding: 16, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 16 },
  status: { color: "#ffd700", fontSize: 14 },
  results: { marginTop: 8 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#222",
  },
  rowLabel: { color: "#aaa", fontSize: 13, flex: 1, paddingRight: 8 },
  rowValue: { color: "#fff", fontSize: 13, fontWeight: "600" },
  rowValueHi: { color: "#4ade80", fontSize: 13, fontWeight: "700" },
});
