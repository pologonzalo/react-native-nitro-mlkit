import { Image as ExpoImage } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import { type ReactNode, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  type Burst,
  buildCleanupPlan,
  type CleanerPhoto,
  type CleanupPlan,
} from "../src/photo-quality";
import { clearScanCache, PERMISSION_DENIED, scanGallery } from "../src/photo-scan";
import { C, F, keycap, R, T, wash } from "../src/theme";
import { Card, Meter } from "../src/ui";

const ACCENT = "#12B981"; // clean emerald

type Phase = "idle" | "scanning" | "done";

export default function CleanerScreen() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [scanned, setScanned] = useState(0);
  const [total, setTotal] = useState(0);
  const [plan, setPlan] = useState<CleanupPlan | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  async function scan(force = false) {
    setNote(null);
    setPhase("scanning");
    setProgress(0);
    setPlan(null);
    setDeleted(new Set());
    try {
      const { photos, skipped } = await scanGallery(
        ({ done, total }) => {
          setScanned(done);
          setTotal(total);
          setProgress(total > 0 ? done / total : 0);
        },
        { force },
      );
      if (photos.length === 0) {
        setPhase("idle");
        setNote("No photos found in this gallery.");
        return;
      }
      setPlan(buildCleanupPlan(photos));
      if (skipped > 0) {
        setNote(`${skipped} iCloud-only photo${skipped === 1 ? "" : "s"} skipped (never downloaded).`);
      }
      setPhase("done");
    } catch (e: any) {
      setNote(
        String(e?.message) === PERMISSION_DENIED
          ? "Gallery permission denied — nothing leaves your phone, we just read photos."
          : "Scan failed — " + String(e?.message ?? e),
      );
      setPhase("idle");
    }
  }

  // What's still on-device after any deletions this session.
  const view = useMemo(() => {
    if (!plan) return null;
    const live = (p: CleanerPhoto) => !deleted.has(p.id);
    const bursts = plan.bursts
      .map((b) => ({ ...b, rest: b.rest.filter(live) }))
      .filter((b) => b.rest.length > 0 && live(b.best));
    const screenshots = plan.screenshots.filter(live);
    const duplicates = bursts.reduce((n, b) => n + b.rest.length, 0);
    return { bursts, screenshots, duplicates, reclaimable: duplicates + screenshots.length };
  }, [plan, deleted]);

  async function remove(ids: string[]) {
    if (ids.length === 0 || busy) return;
    setBusy(true);
    try {
      // iOS and Android both surface their own system "Delete N photos?" prompt
      // here — the hard, undo-safe gate. Returns false if the user cancels it.
      const ok = await MediaLibrary.deleteAssetsAsync(ids);
      if (ok) {
        setDeleted((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.add(id));
          return next;
        });
        clearScanCache(); // a future rescan should reflect reality
      }
    } catch (e: any) {
      setNote("Delete failed — " + String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.emoji}>🧹</Text>
        <Text style={s.title}>Photo Cleaner</Text>
        <Text style={T.sub}>
          On-device face quality picks the best shot from every burst and flags
          screenshot clutter. Nothing leaves your phone.
        </Text>
      </View>

      {phase === "idle" && (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Text style={{ ...T.label, marginBottom: 8 }}>How it works</Text>
            <Bullet emoji="👀">Groups burst shots & retakes taken seconds apart</Bullet>
            <Bullet emoji="😃">Keeps the frame with open eyes + the best smile</Bullet>
            <Bullet emoji="📱">Flags screenshots & text clutter</Bullet>
            <Bullet emoji="🗑️">You review — deletion always asks first</Bullet>
          </Card>
          <Pressable style={s.cta} onPress={() => scan()}>
            <Text style={s.ctaText}>Find clutter 🧹</Text>
          </Pressable>
          <Text style={s.privacy}>Reads your recent photos on-device. Deletion is always confirmed by iOS.</Text>
        </>
      )}

      {phase === "scanning" && (
        <Card>
          <Text style={{ ...T.label, marginBottom: 12 }}>Analysing your photos…</Text>
          <Meter value={progress} accent={ACCENT} />
          <View style={s.scanRow}>
            <ActivityIndicator color={ACCENT} />
            <Text style={s.scanText}>{scanned} / {total} photos · {Math.round(progress * 100)}%</Text>
          </View>
        </Card>
      )}

      {phase === "done" && view && (
        <>
          {/* Hero */}
          <View style={s.hero}>
            <Text style={s.heroNum}>{view.reclaimable}</Text>
            <Text style={s.heroLabel}>photos you could clear</Text>
            <View style={s.heroChips}>
              <HeroChip value={view.duplicates} label="duplicates" />
              <HeroChip value={view.bursts.length} label="bursts" />
              <HeroChip value={view.screenshots.length} label="screenshots" />
            </View>
          </View>

          {view.reclaimable === 0 && (
            <Card style={{ marginBottom: 14 }}>
              <Text style={s.clean}>✨ Squeaky clean — no duplicates or clutter found.</Text>
            </Card>
          )}

          {/* Bursts */}
          {view.bursts.length > 0 && (
            <>
              <View style={s.sectionRow}>
                <Text style={s.section}>Similar shots · keep the best</Text>
                <Pressable
                  style={s.delBtn}
                  disabled={busy}
                  onPress={() => remove(view.bursts.flatMap((b) => b.rest.map((p) => p.id)))}
                >
                  <Text style={s.delBtnText}>Delete {view.duplicates} extras</Text>
                </Pressable>
              </View>
              {view.bursts.map((b) => (
                <BurstRow key={b.best.id} burst={b} />
              ))}
            </>
          )}

          {/* Screenshots */}
          {view.screenshots.length > 0 && (
            <>
              <View style={{ ...s.sectionRow, marginTop: 8 }}>
                <Text style={s.section}>
                  Screenshots · {Math.round((view.screenshots.length / (plan?.totalPhotos ?? 1)) * 100)}% of roll
                </Text>
                <Pressable
                  style={s.delBtn}
                  disabled={busy}
                  onPress={() => remove(view.screenshots.map((p) => p.id))}
                >
                  <Text style={s.delBtnText}>Delete {view.screenshots.length}</Text>
                </Pressable>
              </View>
              <View style={s.grid}>
                {view.screenshots.slice(0, 12).map((p) => (
                  <ExpoImage key={p.id} source={{ uri: p.uri }} style={s.gridThumb} contentFit="cover" transition={120} />
                ))}
              </View>
            </>
          )}

          {busy && (
            <View style={s.busyRow}>
              <ActivityIndicator color={ACCENT} />
              <Text style={s.scanText}>Working…</Text>
            </View>
          )}

          <Pressable style={s.rescan} onPress={() => scan(true)}>
            <Text style={s.rescanText}>Rescan 🔄</Text>
          </Pressable>
        </>
      )}

      {note && <Text style={s.note}>{note}</Text>}
    </ScrollView>
  );
}

function BurstRow({ burst }: { burst: Burst }) {
  const quality = Math.round(burst.bestScore * 100);
  return (
    <Card style={{ marginBottom: 12 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.burstRow}>
        {/* Keeper */}
        <View style={s.shot}>
          <ExpoImage source={{ uri: burst.best.uri }} style={{ ...s.shotImg, borderColor: ACCENT }} contentFit="cover" transition={120} />
          <View style={{ ...s.tag, backgroundColor: ACCENT }}>
            <Text style={s.tagText}>✓ keep · {quality}%</Text>
          </View>
        </View>
        {/* Extras */}
        {burst.rest.map((p) => (
          <View key={p.id} style={s.shot}>
            <ExpoImage source={{ uri: p.uri }} style={{ ...s.shotImg, borderColor: C.ink, opacity: 0.55 }} contentFit="cover" transition={120} />
            <View style={{ ...s.tag, backgroundColor: C.ink }}>
              <Text style={s.tagText}>✕ extra</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </Card>
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

function HeroChip({ value, label }: { value: number; label: string }) {
  return (
    <View style={s.heroChip}>
      <Text style={s.heroChipValue}>{value}</Text>
      <Text style={s.heroChipLabel}>{label}</Text>
    </View>
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
    backgroundColor: ACCENT, borderWidth: 2, borderColor: C.ink, borderRadius: R.lg,
    paddingVertical: 16, alignItems: "center", marginBottom: 12, ...keycap(6),
  },
  ctaText: { color: "#fff", fontFamily: F.display, fontSize: 18 },
  privacy: { color: C.faint, fontFamily: F.body, fontSize: 12, textAlign: "center", lineHeight: 17 },

  scanRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  scanText: { color: C.gold, fontFamily: F.mono, fontSize: 13, fontVariant: ["tabular-nums"] },

  hero: {
    backgroundColor: wash(ACCENT, 0.18), borderColor: ACCENT, borderWidth: 2, borderRadius: R.xl,
    padding: 20, alignItems: "center", marginBottom: 14, ...keycap(5),
  },
  heroNum: { fontFamily: F.display, fontSize: 54, color: C.ink, letterSpacing: -2, lineHeight: 58 },
  heroLabel: { color: C.dim, fontFamily: F.bodySemi, fontSize: 13, marginBottom: 16 },
  heroChips: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
  heroChip: {
    flex: 1, backgroundColor: C.surface, borderWidth: 2, borderColor: C.ink, borderRadius: R.md,
    paddingVertical: 10, alignItems: "center",
  },
  heroChipValue: { color: C.ink, fontFamily: F.display, fontSize: 20, fontVariant: ["tabular-nums"] },
  heroChipLabel: { color: C.faint, fontFamily: F.body, fontSize: 10, marginTop: 2 },

  clean: { fontFamily: F.bodySemi, fontSize: 14, color: C.mintInk, textAlign: "center" },

  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  section: { fontFamily: F.bodyBold, fontSize: 13, color: C.dim, textTransform: "uppercase", letterSpacing: 0.6, flex: 1 },
  delBtn: {
    backgroundColor: wash("#EF4444", 0.14), borderColor: "#EF4444", borderWidth: 2, borderRadius: R.pill,
    paddingVertical: 6, paddingHorizontal: 12, ...keycap(3),
  },
  delBtnText: { color: "#EF4444", fontFamily: F.bodyBold, fontSize: 12 },

  burstRow: { gap: 10, paddingRight: 4 },
  shot: { width: 96 },
  shotImg: { width: 96, height: 96, borderRadius: R.md, borderWidth: 2, backgroundColor: C.surfaceAlt },
  tag: { position: "absolute", bottom: 6, left: 6, borderRadius: R.pill, paddingVertical: 2, paddingHorizontal: 7, borderWidth: 1.5, borderColor: "#fff" },
  tagText: { color: "#fff", fontFamily: F.bodyBold, fontSize: 9.5 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  gridThumb: { width: "31%", aspectRatio: 1, borderRadius: R.sm, borderWidth: 2, borderColor: C.ink, backgroundColor: C.surfaceAlt },

  busyRow: { flexDirection: "row", alignItems: "center", gap: 10, justifyContent: "center", marginVertical: 12 },

  rescan: {
    backgroundColor: wash(ACCENT, 0.16), borderColor: ACCENT, borderWidth: 2, borderRadius: R.md,
    paddingVertical: 13, alignItems: "center", marginTop: 6, ...keycap(4),
  },
  rescanText: { color: C.mintInk, fontFamily: F.bodyBold, fontSize: 14 },

  note: { color: C.gold, fontFamily: F.bodySemi, fontSize: 13, textAlign: "center", marginTop: 16, lineHeight: 19 },
});
