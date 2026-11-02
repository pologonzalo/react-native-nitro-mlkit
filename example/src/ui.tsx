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
import { CameraCapture } from "./CameraCapture";
import { C, F, keycap, R, shade, T, wash } from "./theme";

export type Sample = {
  label: string;
  url: string;
  name?: string;
  /** What this photo exercises — shown under the strip once picked. */
  expect?: string;
};

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

/**
 * The one button. Solid candy fill resting on a darker edge of its own hue;
 * pressing sinks it onto the edge (translateY + edge collapses) — instant on
 * press, so the interface feels like it's listening.
 */
export function Button({
  title,
  onPress,
  accent = C.green,
  variant = "primary",
  small,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  accent?: string;
  variant?: "primary" | "soft";
  small?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: any;
}) {
  const depth = small ? 3 : 4;
  const off = disabled || loading;
  const primary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => ({
        ...ui.btn,
        paddingVertical: small ? 10 : 14,
        backgroundColor: off ? C.borderSoft : primary ? accent : C.surface,
        borderWidth: primary ? 0 : 2,
        borderColor: C.border,
        ...keycap(pressed || off ? 0 : depth, primary ? shade(accent) : C.border),
        transform: [{ translateY: pressed && !off ? depth : 0 }],
        ...(style ?? {}),
      })}
    >
      {loading && <ActivityIndicator size="small" color={primary ? "#fff" : accent} />}
      <Text
        style={{
          ...ui.btnText,
          fontSize: small ? 13 : 15,
          color: off ? C.faint : primary ? "#fff" : accent,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

/** Package name + one-line tagline shown at the top of a screen. */
export function TitleBlock({ name, tagline }: { name: string; tagline: string }) {
  return (
    <View style={{ marginBottom: 16, gap: 6 }}>
      <View style={ui.pkgChip}>
        <Text style={ui.pkg}>{name}</Text>
      </View>
      <Text style={T.sub}>{tagline}</Text>
    </View>
  );
}

/** A white card resting on its hairline edge. */
export function Card({ children, style }: { children: ReactNode; style?: any }) {
  return <View style={{ ...ui.card, ...(style ?? {}) }}>{children}</View>;
}

/** A small stat chip: soft wash of the accent, bold colored text. */
export function Pill({ children, accent = C.green }: { children: ReactNode; accent?: string }) {
  return (
    <View style={{ ...ui.pill, backgroundColor: wash(accent, 0.14) }}>
      <Text style={{ ...ui.pillText, color: shade(accent, 0.1) }}>{children}</Text>
    </View>
  );
}

/** A 0..1 meter — rounded track with a subtle shine on the fill. */
export function Meter({ value, accent = C.green }: { value: number; accent?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View style={ui.meterTrack}>
      <View style={{ ...ui.meterFill, width: `${pct}%`, backgroundColor: accent }}>
        {pct > 8 && <View style={ui.meterShine} />}
      </View>
    </View>
  );
}

/**
 * Image-source picker: a segmented control (Gallery · Camera · Stock) with a
 * springy sliding puck. Gallery/Camera launch immediately; Stock reveals a
 * flickable strip of sample cards that download-on-tap.
 */
export function SamplePicker({
  samples,
  accent = C.green,
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
  const [camOpen, setCamOpen] = useState(false);
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

  function fromCamera() {
    // In-app camera instead of ImagePicker.launchCameraAsync: the system
    // picker never offers the ultra-wide (0.5x) lens on iOS.
    slide(1);
    setCamOpen(true);
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
              style={({ pressed }) => ({
                ...ui.thumb,
                ...(selected === i ? { borderColor: accent } : {}),
                ...keycap(pressed ? 0 : 2, selected === i ? shade(accent, 0.1) : C.border),
                transform: [{ translateY: pressed ? 2 : 0 }],
              })}
            >
              <ExpoImage source={{ uri: sample.url }} style={ui.thumbImg} contentFit="cover" transition={150} />
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
              <Text style={ui.thumbLabel} numberOfLines={2}>{sample.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {mode === 2 && selected !== null && samples[selected]?.expect && (
        <View style={{ ...ui.expectRow, borderColor: shade(accent, 0.35) }}>
          <Text style={{ ...ui.expectTag, color: accent }}>expected</Text>
          <Text style={ui.expectText}>{samples[selected].expect}</Text>
        </View>
      )}

      <CameraCapture
        visible={camOpen}
        accent={accent}
        onClose={() => setCamOpen(false)}
        onCapture={(uri) => {
          setSelected(null);
          onPick(uri);
        }}
      />
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
        <View style={{ width: dispW, height: dispH }}>
          <Image
            source={{ uri }}
            style={{ width: dispW, height: dispH, borderRadius: R.lg, borderWidth: 2, borderColor: C.border }}
            resizeMode="cover"
          />
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
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: R.lg,
    paddingHorizontal: 16,
  },
  btnText: {
    fontFamily: F.display,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  pkgChip: {
    alignSelf: "flex-start",
    backgroundColor: C.surfaceAlt,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  pkg: { fontFamily: F.mono, fontSize: 12.5, color: C.dim },

  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 2,
    borderColor: C.border,
    padding: 16,
    ...keycap(2),
  },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 11,
    borderRadius: R.pill,
    alignSelf: "flex-start",
  },
  pillText: { fontFamily: F.bodyBold, fontSize: 12 },

  meterTrack: { height: 12, borderRadius: R.pill, backgroundColor: C.border, overflow: "hidden" },
  meterFill: { height: "100%", borderRadius: R.pill },
  meterShine: {
    position: "absolute",
    top: 3,
    left: 8,
    right: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },

  segwrap: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: R.pill,
    padding: 4,
    position: "relative",
    ...keycap(2),
  },
  puck: { position: "absolute", top: 4, left: 4, bottom: 4, borderRadius: R.pill },
  seg: { flex: 1, paddingVertical: 11, alignItems: "center", zIndex: 2 },
  segText: { fontFamily: F.bodyBold, fontSize: 13 },

  strip: { gap: 12, paddingTop: 14, paddingBottom: 6, paddingRight: 8 },
  thumb: {
    width: 92,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.border,
    padding: 4,
    paddingBottom: 7,
  },
  thumbImg: { width: "100%", height: 78, borderRadius: 9, backgroundColor: C.surfaceAlt },
  thumbLabel: { fontFamily: F.bodySemi, color: C.dim, fontSize: 11, textAlign: "center", marginTop: 5 },
  expectRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, backgroundColor: C.surface },
  expectTag: { fontFamily: F.bodySemi, fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase" },
  expectText: { flex: 1, fontFamily: F.body, color: C.dim, fontSize: 12, lineHeight: 16 },
  thumbOverlay: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", backgroundColor: "#000A", borderRadius: 12 },
  check: { position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  checkMark: { color: "#fff", fontSize: 11, fontWeight: "900" },

  boxLabel: {
    position: "absolute",
    top: -20,
    left: -3,
    color: "#fff",
    fontFamily: F.bodyBold,
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden",
  },
});
