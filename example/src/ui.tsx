import { Directory, File, Paths } from "expo-file-system";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { type ReactNode, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { C, F, keycap, R, T, tint } from "./theme";

export type Sample = { label: string; url: string; name?: string };

/** Downloads a remote sample once into the sandbox and returns its file:// uri. */
export async function downloadSample(url: string, name: string): Promise<string> {
  const dir = new Directory(Paths.document, "samples");
  if (!dir.exists) dir.create();
  const dest = new File(dir, name);
  if (dest.exists) dest.delete();
  await File.downloadFileAsync(url, dest);
  return dest.uri;
}

/** Intrinsic pixel size of an image uri (for scaling detection overlays). */
export function imageSize(uri: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (w, h) => resolve({ w, h }),
      () => resolve({ w: 0, h: 0 }),
    );
  });
}

/** Package name + one-line tagline shown at the top of a screen. */
export function TitleBlock({ name, tagline }: { name: string; tagline: string }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={ui.pkg}>{name}</Text>
      <Text style={T.sub}>{tagline}</Text>
    </View>
  );
}

/** A chunky keycap surface card. */
export function Card({ children, style }: { children: ReactNode; style?: any }) {
  return <View style={{ ...ui.card, ...(style ?? {}) }}>{children}</View>;
}

/** A small chunky stat chip. */
export function Pill({ children, accent = C.orange }: { children: ReactNode; accent?: string }) {
  return (
    <View style={{ ...ui.pill, backgroundColor: tint(accent, 0.14), borderColor: accent }}>
      <Text style={{ ...ui.pillText, color: accent }}>{children}</Text>
    </View>
  );
}

/** A 0..1 meter — chunky rounded track. */
export function Meter({ value, accent = C.orange }: { value: number; accent?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View style={ui.meterTrack}>
      <View style={{ ...ui.meterFill, width: `${pct}%`, backgroundColor: accent }} />
    </View>
  );
}

/**
 * Image-source picker: a fat segmented control (Gallery · Camera · Stock) with
 * a springy sliding puck. Gallery/Camera launch immediately; Stock reveals a
 * flickable strip of polaroid stock cards that download-on-tap.
 */
export function SamplePicker({
  samples,
  accent = C.orange,
  onPick,
  disabled,
}: {
  samples: Sample[];
  accent?: string;
  onPick: (uri: string) => void;
  disabled?: boolean;
}) {
  const [mode, setMode] = useState<0 | 1 | 2>(2); // default: Stock strip open
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [w, setW] = useState(0);
  const puck = useRef(new Animated.Value(2)).current;
  const lock = disabled || busy !== null;

  function slide(i: 0 | 1 | 2) {
    setMode(i);
    Animated.spring(puck, {
      toValue: i,
      useNativeDriver: true,
      damping: 14,
      stiffness: 180,
      mass: 0.7,
    }).start();
  }

  async function fromCamera() {
    slide(1);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert("Camera", "Camera permission is required.");
    const res = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!res.canceled && res.assets[0]) {
      setSelected(null);
      onPick(res.assets[0].uri);
    }
  }
  async function fromGallery() {
    slide(0);
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 1 });
    if (!res.canceled && res.assets[0]) {
      setSelected(null);
      onPick(res.assets[0].uri);
    }
  }
  async function fromSample(i: number) {
    const sample = samples[i];
    setBusy(i);
    try {
      const uri = await downloadSample(sample.url, sample.name ?? `sample-${i}.jpg`);
      setSelected(i);
      onPick(uri);
    } catch (e: any) {
      Alert.alert("Sample", e.message);
    }
    setBusy(null);
  }

  const seg = w > 0 ? (w - 8) / 3 : 0;
  const SEGS: { k: 0 | 1 | 2; label: string; emoji: string; onPress: () => void }[] = [
    { k: 0, label: "Gallery", emoji: "🖼️", onPress: fromGallery },
    { k: 1, label: "Camera", emoji: "📷", onPress: fromCamera },
    { k: 2, label: "Stock", emoji: "🎞️", onPress: () => slide(2) },
  ];

  return (
    <View>
      <View style={ui.segwrap} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {seg > 0 && (
          <Animated.View
            style={{
              ...ui.puck,
              width: seg,
              backgroundColor: accent,
              transform: [{ translateX: Animated.multiply(puck, seg) }],
            }}
          />
        )}
        {SEGS.map((s) => (
          <Pressable key={s.k} style={ui.seg} onPress={s.onPress} disabled={lock}>
            <Text style={{ ...ui.segText, color: mode === s.k ? "#fff" : C.dim }}>
              {s.emoji} {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === 2 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ui.strip}>
          {samples.map((sample, i) => (
            <Pressable
              key={i}
              onPress={() => fromSample(i)}
              disabled={lock}
              style={{ ...ui.polaroid, ...(selected === i ? { borderColor: accent } : {}), transform: [{ rotate: i % 2 ? "1.5deg" : "-1.5deg" }] }}
            >
              <ExpoImage source={{ uri: sample.url }} style={ui.polaroidImg} contentFit="cover" transition={150} />
              {busy === i && (
                <View style={ui.thumbOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
              {selected === i && (
                <View style={{ ...ui.check, backgroundColor: accent }}>
                  <Text style={ui.checkMark}>✓</Text>
                </View>
              )}
              <Text style={ui.polaroidLabel} numberOfLines={1}>{sample.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export type Mark = { x: number; y: number };
export type Box = { x: number; y: number; width: number; height: number; label?: string };

/** An image with detection results drawn on top (points and/or boxes). */
export function AnnotatedImage({
  uri,
  imageW,
  imageH,
  accent = C.yellow,
  points,
  boxes,
  dotSize = 5,
  maxHeight = 340,
}: {
  uri: string;
  imageW: number;
  imageH: number;
  accent?: string;
  points?: Mark[];
  boxes?: Box[];
  dotSize?: number;
  maxHeight?: number;
}) {
  const [w, setW] = useState(0);
  const ratio = imageW > 0 ? imageH / imageW : 0.75;
  let dispW = w;
  let dispH = w * ratio;
  if (dispH > maxHeight) {
    dispH = maxHeight;
    dispW = maxHeight / ratio;
  }
  const sx = imageW > 0 ? dispW / imageW : 0;
  const sy = imageH > 0 ? dispH / imageH : 0;

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ alignItems: "center", marginTop: 16 }}>
      {w > 0 && (
        <View style={{ width: dispW, height: dispH, transform: [{ rotate: "-1.2deg" }] }}>
          <Image source={{ uri }} style={{ width: dispW, height: dispH, borderRadius: R.lg, borderWidth: 3, borderColor: "#fff" }} resizeMode="cover" />
          {points?.map((p, i) => (
            <View
              key={`p${i}`}
              style={{
                position: "absolute",
                left: p.x * sx - dotSize / 2,
                top: p.y * sy - dotSize / 2,
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: accent,
              }}
            />
          ))}
          {boxes?.map((b, i) => (
            <View
              key={`b${i}`}
              style={{
                position: "absolute",
                left: b.x * sx,
                top: b.y * sy,
                width: b.width * sx,
                height: b.height * sy,
                borderWidth: 3,
                borderColor: accent,
                borderRadius: 10,
              }}
            >
              {b.label ? (
                <Text style={{ ...ui.boxLabel, backgroundColor: accent }} numberOfLines={1}>{b.label}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const ui = StyleSheet.create({
  pkg: { fontFamily: F.display, fontSize: 20, color: C.text, letterSpacing: -0.3 },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 2,
    borderColor: C.ink,
    padding: 16,
    ...keycap(6),
  },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 11,
    borderRadius: R.pill,
    borderWidth: 2,
    alignSelf: "flex-start",
  },
  pillText: { fontFamily: F.bodyBold, fontSize: 12 },
  meterTrack: { height: 10, borderRadius: R.pill, backgroundColor: C.peg, borderWidth: 1.5, borderColor: C.ink, overflow: "hidden" },
  meterFill: { height: "100%", borderRadius: R.pill },

  segwrap: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: R.pill,
    padding: 4,
    position: "relative",
    ...keycap(4),
  },
  puck: { position: "absolute", top: 4, left: 4, bottom: 4, borderRadius: R.pill },
  seg: { flex: 1, paddingVertical: 11, alignItems: "center", zIndex: 2 },
  segText: { fontFamily: F.bodyBold, fontSize: 13 },

  strip: { gap: 12, paddingTop: 14, paddingBottom: 6, paddingRight: 8 },
  polaroid: {
    width: 92,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.ink,
    padding: 5,
    paddingBottom: 8,
    ...keycap(5),
  },
  polaroidImg: { width: "100%", height: 78, borderRadius: 8, backgroundColor: C.surfaceAlt },
  polaroidLabel: { fontFamily: F.bodySemi, color: C.dim, fontSize: 11, textAlign: "center", marginTop: 5 },
  thumbOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "#000A", borderRadius: 14 },
  check: { position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.ink },
  checkMark: { color: "#fff", fontSize: 11, fontWeight: "900" },

  boxLabel: {
    position: "absolute",
    top: -20,
    left: -3,
    color: C.ink,
    fontFamily: F.bodyBold,
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
});
