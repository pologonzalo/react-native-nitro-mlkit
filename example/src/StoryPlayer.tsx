import { Image } from "expo-image";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { Slide } from "./gallery-insights";
import { F } from "./theme";

const DURATION = 4500; // ms per slide
const TICK = 50;

/**
 * Full-screen, Instagram/Google-Photos-style story player. Progress bars up
 * top, auto-advance, tap left/right to go back/forward, and a montage of the
 * real photos behind each slide's headline.
 */
export function StoryPlayer({ slides, onClose }: { slides: Slide[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = slides[index];

  function goNext() {
    if (index < slides.length - 1) {
      setIndex(index + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }

  function goPrev() {
    if (index > 0) setIndex(index - 1);
    setProgress(0);
  }

  // Tick the current slide's progress bar.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setProgress((p) => (p + TICK / DURATION >= 1 ? 1 : p + TICK / DURATION));
    }, TICK);
    return () => clearInterval(id);
  }, [index, paused]);

  // Advance once the bar fills — in an effect (not inside the setState updater)
  // so we never setState on the parent during render.
  useEffect(() => {
    if (progress >= 1) goNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  if (!slide) return null;

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <StorySlide
        slide={slide}
        index={index}
        count={slides.length}
        progress={progress}
        onNext={goNext}
        onPrev={goPrev}
        onClose={onClose}
        onPauseChange={setPaused}
      />
    </Modal>
  );
}

function StorySlide({
  slide,
  index,
  count,
  progress,
  onNext,
  onPrev,
  onClose,
  onPauseChange,
}: {
  slide: Slide;
  index: number;
  count: number;
  progress: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onPauseChange: (p: boolean) => void;
}) {
  const { width, height } = useWindowDimensions();
  const hero = slide.photos[0];
  const mosaic = slide.photos.slice(0, 9);

  return (
    <View style={s.root}>
      {/* Background: a mosaic of the real photos for this theme */}
      <View style={s.mosaic} pointerEvents="none">
        {mosaic.map((uri, i) => (
          <Image
            key={`${uri}-${i}`}
            source={{ uri }}
            style={{ width: width / 3, height: height / 3 }}
            contentFit="cover"
            transition={200}
          />
        ))}
        {mosaic.length === 0 && hero && (
          <Image source={{ uri: hero }} style={{ width, height }} contentFit="cover" />
        )}
      </View>
      {/* Scrims for legibility */}
      <View style={[s.scrim, { backgroundColor: "rgba(8,8,22,0.55)" }]} pointerEvents="none" />
      <View style={[s.scrimBottom, { height: height * 0.55 }]} pointerEvents="none" />
      <View
        style={[s.accentGlow, { backgroundColor: slide.accent }]}
        pointerEvents="none"
      />

      {/* Tap zones */}
      <Pressable
        style={[s.tapZone, { left: 0, width: width * 0.32 }]}
        onPress={onPrev}
        onLongPress={() => onPauseChange(true)}
        onPressOut={() => onPauseChange(false)}
        delayLongPress={180}
      />
      <Pressable
        style={[s.tapZone, { right: 0, width: width * 0.68 }]}
        onPress={onNext}
        onLongPress={() => onPauseChange(true)}
        onPressOut={() => onPauseChange(false)}
        delayLongPress={180}
      />

      {/* Progress bars */}
      <View style={s.bars} pointerEvents="none">
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={s.barTrack}>
            <View
              style={{
                height: 3,
                borderRadius: 2,
                backgroundColor: "#fff",
                width: i < index ? "100%" : i === index ? `${Math.round(progress * 100)}%` : "0%",
              }}
            />
          </View>
        ))}
      </View>

      {/* Close */}
      <Pressable style={s.close} onPress={onClose} hitSlop={12}>
        <Text style={s.closeText}>✕</Text>
      </Pressable>

      {/* Content */}
      <View style={s.content} pointerEvents="none">
        <Text style={s.emoji}>{slide.emoji}</Text>
        <Text style={s.title}>{slide.title}</Text>
        <Text style={[s.subtitle, { color: "#EDEDF7" }]}>{slide.subtitle}</Text>
        <View style={[s.rule, { backgroundColor: slide.accent }]} />
        {slide.photos.length > 1 && (
          <View style={s.strip}>
            {slide.photos.slice(0, 5).map((uri, i) => (
              <Image
                key={`${uri}-strip-${i}`}
                source={{ uri }}
                style={[s.stripThumb, { borderColor: slide.accent }]}
                contentFit="cover"
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#06060F" },
  mosaic: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    flexWrap: "wrap",
    overflow: "hidden",
  },
  scrim: { ...StyleSheet.absoluteFillObject },
  scrimBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(6,6,15,0.72)",
  },
  accentGlow: {
    position: "absolute",
    bottom: -120,
    alignSelf: "center",
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.22,
  },
  tapZone: { position: "absolute", top: 0, bottom: 0, zIndex: 5 },
  bars: {
    position: "absolute",
    top: 52,
    left: 12,
    right: 12,
    flexDirection: "row",
    gap: 4,
    zIndex: 10,
  },
  barTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
  },
  close: {
    position: "absolute",
    top: 66,
    right: 16,
    zIndex: 20,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: "#fff", fontFamily: F.bodyBold, fontSize: 20 },
  content: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 64,
    zIndex: 8,
  },
  emoji: { fontSize: 64, marginBottom: 10 },
  title: { color: "#fff", fontFamily: F.display, fontSize: 36, letterSpacing: -0.8, lineHeight: 40 },
  subtitle: { fontFamily: F.bodySemi, fontSize: 16, marginTop: 8, lineHeight: 22 },
  rule: { width: 48, height: 4, borderRadius: 2, marginTop: 16 },
  strip: { flexDirection: "row", gap: 8, marginTop: 20 },
  stripThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: "#1B1E3A",
  },
});
