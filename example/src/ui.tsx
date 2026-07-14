import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { type ReactNode, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { C, R, T, tint } from "./theme";

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
    <View style={{ marginBottom: 14 }}>
      <Text style={ui.pkg}>{name}</Text>
      <Text style={T.sub}>{tagline}</Text>
    </View>
  );
}

/** A rounded surface card. */
export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: any;
}) {
  return <View style={{ ...ui.card, ...(style ?? {}) }}>{children}</View>;
}

/** A small labelled stat chip. */
export function Pill({
  children,
  accent = C.dim,
}: {
  children: ReactNode;
  accent?: string;
}) {
  return (
    <View style={{ ...ui.pill, backgroundColor: tint(accent, 0.16), borderColor: tint(accent, 0.5) }}>
      <Text style={{ ...ui.pillText, color: accent }}>{children}</Text>
    </View>
  );
}

/** A 0..1 confidence meter. */
export function Meter({ value, accent }: { value: number; accent: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View style={ui.meterTrack}>
      <View style={{ ...ui.meterFill, width: `${pct}%`, backgroundColor: accent }} />
    </View>
  );
}

/**
 * Image-source picker: a horizontal strip with Camera + Gallery tiles followed
 * by ~10 curated stock thumbnails. Tapping a stock thumbnail downloads it and
 * calls `onPick(fileUri)`; camera/gallery return the captured/selected uri.
 */
export function SamplePicker({
  samples,
  accent,
  onPick,
  disabled,
}: {
  samples: Sample[];
  accent: string;
  onPick: (uri: string) => void;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const lock = disabled || busy !== null;

  async function fromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Camera", "Camera permission is required to take a photo.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!res.canceled && res.assets[0]) {
      setSelected(null);
      onPick(res.assets[0].uri);
    }
  }

  async function fromGallery() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 1,
    });
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

  return (
    <View>
      <View style={ui.srcHead}>
        <Text style={T.faint}>SOURCE</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ui.strip}
      >
        <ActionTile emoji="📷" label="Camera" accent={accent} onPress={fromCamera} disabled={lock} />
        <ActionTile emoji="🖼️" label="Gallery" accent={accent} onPress={fromGallery} disabled={lock} />
        <View style={ui.divider} />
        {samples.map((sample, i) => (
          <Pressable
            key={i}
            onPress={() => fromSample(i)}
            disabled={lock}
            style={{
              ...ui.thumbWrap,
              borderColor: selected === i ? accent : "transparent",
            }}
          >
            <Image source={{ uri: sample.url }} style={ui.thumb} resizeMode="cover" />
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
            <Text style={ui.thumbLabel} numberOfLines={1}>
              {sample.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export type Mark = { x: number; y: number };
export type Box = { x: number; y: number; width: number; height: number; label?: string };

/**
 * An image with detection results drawn on top (points and/or boxes), scaled
 * from the original pixel space to the displayed size. Great for visually
 * comparing what the model found against the photo.
 */
export function AnnotatedImage({
  uri,
  imageW,
  imageH,
  accent,
  points,
  boxes,
  dotSize = 4,
  maxHeight = 340,
}: {
  uri: string;
  imageW: number;
  imageH: number;
  accent: string;
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
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ alignItems: "center", marginTop: 16 }}
    >
      {w > 0 && (
        <View style={{ width: dispW, height: dispH }}>
          <Image
            source={{ uri }}
            style={{ width: dispW, height: dispH, borderRadius: R.lg }}
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
                borderWidth: 2,
                borderColor: accent,
                borderRadius: 6,
              }}
            >
              {b.label ? (
                <Text style={{ ...ui.boxLabel, backgroundColor: accent }} numberOfLines={1}>
                  {b.label}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ActionTile({
  emoji,
  label,
  accent,
  onPress,
  disabled,
}: {
  emoji: string;
  label: string;
  accent: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{ ...ui.actionTile, backgroundColor: tint(accent, 0.16), borderColor: tint(accent, 0.5) }}
    >
      <Text style={ui.actionEmoji}>{emoji}</Text>
      <Text style={{ ...ui.actionLabel, color: accent }}>{label}</Text>
    </Pressable>
  );
}

const THUMB = 74;

const ui = StyleSheet.create({
  pkg: { fontSize: 15, fontWeight: "700", color: C.text, fontFamily: undefined },
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
    padding: 14,
  },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: R.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: "flex-start",
  },
  pillText: { fontSize: 12, fontWeight: "700" },
  meterTrack: {
    height: 6,
    borderRadius: R.pill,
    backgroundColor: C.borderSoft,
    overflow: "hidden",
  },
  meterFill: { height: 6, borderRadius: R.pill },
  srcHead: { marginBottom: 8 },
  strip: { gap: 10, paddingRight: 8, alignItems: "flex-start" },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: C.border, marginHorizontal: 2, alignSelf: "stretch" },
  actionTile: {
    width: THUMB,
    height: THUMB,
    borderRadius: R.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  actionEmoji: { fontSize: 24 },
  actionLabel: { fontSize: 11, fontWeight: "700" },
  thumbWrap: {
    width: THUMB,
    borderRadius: R.md,
    borderWidth: 2,
    padding: 2,
  },
  thumb: {
    width: THUMB - 8,
    height: THUMB - 8,
    borderRadius: R.sm,
    backgroundColor: C.surfaceAlt,
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000A",
    borderRadius: R.md,
  },
  check: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { color: "#fff", fontSize: 11, fontWeight: "900" },
  thumbLabel: { color: C.dim, fontSize: 10, textAlign: "center", marginTop: 3 },
  boxLabel: {
    position: "absolute",
    top: -18,
    left: -2,
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: "hidden",
  },
});
